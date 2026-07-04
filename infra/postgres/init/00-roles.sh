#!/usr/bin/env bash
# Bootstrap the non-Supabase auth stub + RBAC roles the db-schema RLS expects.
# Mirrors the "Non-Supabase Postgres" section of db-schema/README.md.
# Runs once on a fresh data volume (docker-entrypoint-initdb.d), BEFORE the
# db-schema migration sequence is applied.
#
# A .sh wrapper (not plain .sql) so the `app` role's password can come from
# APP_DB_PASSWORD (docker-entrypoint-initdb.d does not expand env vars inside
# .sql files) instead of being left unset — a real gap found while first
# applying migrations against a live DB (2026-07-03): `app` had no password
# and no table privileges at all, so no login/query as `app` ever worked.
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" \
  -v app_password="$APP_DB_PASSWORD" <<'SQL'
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- auth schema stub: auth.users + auth.uid() reading the per-request setting.
CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE
);

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE AS
$$ SELECT nullif(current_setting('app.user_id', true), '')::uuid $$;

-- auth.users lives outside `public` (see GRANTs below) — not covered by the
-- `ALTER DEFAULT PRIVILEGES ... IN SCHEMA public` further down.
GRANT USAGE ON SCHEMA auth TO authenticated, service_role;
GRANT ALL ON auth.users TO authenticated, service_role;

-- RBAC roles the RLS policies grant to.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role BYPASSRLS;
  END IF;
END $$;

-- The application logs in as this role, then `SET LOCAL ROLE authenticated`
-- (or service_role on marked paths) per request.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    CREATE ROLE app LOGIN;
  END IF;
END $$;
ALTER ROLE app WITH PASSWORD :'app_password';
GRANT authenticated, service_role TO app;

-- Table GRANTs are separate from RLS (docs/architecture.md §4: RLS filters
-- *rows*, it never grants access on its own — the underlying GRANT still has
-- to exist, or every query 403s with "permission denied" regardless of RLS).
-- `db-schema/`'s migrations only create tables; nothing else ever grants
-- these, so cover both the tables that exist yet (none, on a fresh volume)
-- and everything the `db-schema` migrations create afterward.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
SQL
