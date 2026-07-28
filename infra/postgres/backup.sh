#!/usr/bin/env bash
# In-container Postgres backup — runs INSIDE this image (baked in by
# infra/postgres/Dockerfile), unlike infra/scripts/backup.sh which runs on
# the host via `docker compose exec` (local dev convenience wrapper). This
# one exists because Coolify Scheduled Tasks execute a command inside the
# target resource's own container, not on the host — see COOLIFY.md for the
# exact Scheduled Task setup (command, schedule, and the /backups volume
# this needs mounted first).
#
# Same dump -> gzip -> integrity-check -> prune shape as infra/scripts/backup.sh,
# just without the docker-compose-exec wrapper around it.
set -euo pipefail

BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
POSTGRES_DB="${POSTGRES_DB:-sbmj_erp}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_FILE="$BACKUP_DIR/${POSTGRES_DB}_${STAMP}.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "==> Dumping $POSTGRES_DB to $OUT_FILE"
pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=plain | gzip > "$OUT_FILE"

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
