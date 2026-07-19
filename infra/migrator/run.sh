#!/usr/bin/env bash
# Applies drizzle-generated migration SQL files to $DATABASE_URL, in order,
# for every migration whose numeric prefix is >= MIGRATE_FROM (default 20).
#
# Why a range instead of drizzle-kit migrate: this DB was provisioned by
# hand (db-schema/scripts/migrate.sh, psql -f) with NO drizzle tracking
# table, so `drizzle-kit migrate` would try to re-apply everything. The DB
# is known-good through 0019, so we apply 0020+ once.
#
# Run once per new batch of migrations, e.g.:
#   docker run --rm --network coolify \
#     -e DATABASE_URL='postgres://postgres:<pw>@sbmj-db:5432/sbmj_erp' \
#     ghcr.io/lukydwisaputra/erp-migrator:testing
# Bump MIGRATE_FROM when the applied baseline moves forward.
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL required (superuser connection string)}"
FROM_NUM="${MIGRATE_FROM:-20}"

shopt -s nullglob
for f in $(ls /migrations/*.sql | sort); do
  base="$(basename "$f")"
  num="$(printf '%s' "$base" | cut -d_ -f1 | sed 's/^0*//')"
  [ -z "$num" ] && num=0
  if [ "$num" -ge "$FROM_NUM" ]; then
    echo "==> applying $base"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"
  else
    echo "-- skip $base (below MIGRATE_FROM=$FROM_NUM)"
  fi
done
echo "✓ migrations applied"
