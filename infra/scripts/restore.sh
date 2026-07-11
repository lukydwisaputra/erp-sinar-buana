#!/usr/bin/env bash
# Restores a backup.sh dump into the running `postgres` service. Destructive
# — drops and recreates the target database first, so this asks for
# confirmation unless $FORCE=1.
#
# Usage: ./infra/scripts/restore.sh ./backups/sbmj_erp_20260101T020000Z.sql.gz
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

DUMP_FILE="${1:?Usage: restore.sh <path-to-dump.sql.gz>}"
POSTGRES_DB="${POSTGRES_DB:-sbmj_erp}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"

if [ ! -f "$DUMP_FILE" ]; then
  echo "No such file: $DUMP_FILE" >&2
  exit 1
fi

if [ "${FORCE:-0}" != "1" ]; then
  read -r -p "This will DROP and recreate '$POSTGRES_DB' from $DUMP_FILE. Type the database name to confirm: " confirm
  if [ "$confirm" != "$POSTGRES_DB" ]; then
    echo "Aborted." >&2
    exit 1
  fi
fi

echo "==> Dropping and recreating $POSTGRES_DB"
docker compose -f infra/docker-compose.yml exec -T postgres \
  psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1 -c \
  "DROP DATABASE IF EXISTS \"$POSTGRES_DB\"; CREATE DATABASE \"$POSTGRES_DB\";"

echo "==> Restoring $DUMP_FILE"
gunzip -c "$DUMP_FILE" | docker compose -f infra/docker-compose.yml exec -T postgres \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -v ON_ERROR_STOP=1

echo "✓ Restore complete."
