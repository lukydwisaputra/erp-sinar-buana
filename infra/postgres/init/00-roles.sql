-- Bootstrap the non-Supabase auth stub + RBAC roles the db-schema RLS expects.
-- Mirrors the "Non-Supabase Postgres" section of db-schema/README.md.
-- Runs once on a fresh data volume (docker-entrypoint-initdb.d), BEFORE the
-- db-schema migration sequence is applied.

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
-- (or service_role on marked paths) per request. Set its password via env.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app') THEN
    CREATE ROLE app LOGIN;
  END IF;
END $$;
GRANT authenticated, service_role TO app;
