#!/usr/bin/env bash
# Applies the full db-schema in the documented order (see ../README.md
# "Applying the schema") against $DATABASE_URL — replaces the previous
# "manually run ~12 psql -f commands by hand, in a specific order you have
# to remember" process with one command.
#
# Needs a role with schema-level DDL rights (the superuser `postgres`, not
# the `app` LOGIN role — matches the precedent already used for local dev:
# `docker exec infra-postgres-1 psql -U postgres ...`).
#
# Idempotent for a genuinely fresh database (every statement is a first-time
# CREATE). Re-running against an already-provisioned database is NOT fully
# safe — some RLS policy blocks in sql/rls/10_policies.sql don't `drop
# policy if exists` before creating (a known, documented gap; see the
# per-table `create policy ... if not exists`-via-`pg_policies` workaround
# used for incremental hotfixes instead). This script is for provisioning a
# new environment, not patching a live one.
#
# Usage: DATABASE_URL=postgres://postgres:<pw>@host:port/db ./migrate.sh
set -euo pipefail

if [ -z "${DATABASE_URL:-}" ]; then
  echo "DATABASE_URL must be set (the superuser connection string, not the app role)." >&2
  exit 1
fi

cd "$(dirname "${BASH_SOURCE[0]}")/.."

run() {
  echo "==> $1"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$1"
}

echo "── 1. Drizzle-generated migrations (tables/FKs/enums) ──"
for f in migrations/*.sql; do
  run "$f"
done

echo "── 2. Link user_profiles.id -> auth.users(id) ──"
run "sql/00_auth_link.sql"

echo "── 3. Indexes + partial-unique constraints ──"
run "sql/indexes.sql"

echo "── 4. Triggers / functions (helpers first) ──"
for f in sql/triggers/00_helpers_updated_at.sql \
         sql/triggers/10_numbering.sql \
         sql/triggers/20_billing_automation.sql \
         sql/triggers/30_payroll_automation.sql \
         sql/triggers/40_tax_automation.sql \
         sql/triggers/50_audit.sql; do
  run "$f"
done

echo "── 5. RLS (helpers before policies) ──"
run "sql/rls/00_helpers.sql"
run "sql/rls/10_policies.sql"

echo "── 6. Seed defaults ──"
run "sql/seed/00_seed.sql"

echo "✓ Schema fully applied."
