#!/usr/bin/env bash
# Postgres backup — the NFR Bab 13 "scheduled pg_dump" requirement
# (docs/architecture.md §2), which previously existed only as a sentence in
# the docs with no actual script or schedule behind it.
#
# Runs `pg_dump` against the `postgres` service (via `docker compose exec`,
# so it works identically whether invoked by hand, cron, or a CI job — no
# separate host-side psql/pg_dump install needed) and keeps the last
# $BACKUP_RETENTION_DAYS days of dumps, deleting older ones.
#
# Usage (from the repo root):
#   BACKUP_DIR=/var/backups/sbmj-erp ./infra/scripts/backup.sh
#
# Schedule with cron, e.g. daily at 02:00:
#   0 2 * * * cd /path/to/repo && BACKUP_DIR=/var/backups/sbmj-erp ./infra/scripts/backup.sh >> /var/log/sbmj-backup.log 2>&1
#
# On Coolify: run this as a Scheduled Task (or a sidecar cron container) —
# there's no built-in backup for a custom-image Postgres service like this
# one (pg_cron baked in), only for Coolify's own managed database resources.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
POSTGRES_DB="${POSTGRES_DB:-sbmj_erp}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="$BACKUP_DIR/${POSTGRES_DB}_${STAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "==> Dumping $POSTGRES_DB to $OUT_FILE"
docker compose -f infra/docker-compose.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=plain \
  | gzip > "$OUT_FILE"

# A truncated/failed dump still leaves a (small, invalid) file behind —
# gzip's own integrity check is a cheap way to catch that before trusting
# this backup, rather than discovering it's corrupt during an actual restore.
if ! gzip -t "$OUT_FILE"; then
  echo "✗ Backup file failed gzip integrity check: $OUT_FILE" >&2
  rm -f "$OUT_FILE"
  exit 1
fi

SIZE="$(du -h "$OUT_FILE" | cut -f1)"
echo "✓ Backup complete: $OUT_FILE ($SIZE)"

echo "==> Pruning backups older than $RETENTION_DAYS days"
find "$BACKUP_DIR" -name "${POSTGRES_DB}_*.sql.gz" -mtime "+$RETENTION_DAYS" -print -delete
