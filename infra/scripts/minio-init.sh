#!/bin/sh
# Bootstraps the bucket + public-read policy for uploads (docs/architecture.md
# §6). Run once per MinIO instance — idempotent (mb --ignore-existing, and
# re-applying the same anonymous policy is a no-op).
#
# Local dev: runs automatically as the `minio-init` one-shot service in
# infra/docker-compose.yml. On Coolify there's no docker-compose to hang a
# one-shot service off of — run this by hand from the `mc` image once against
# the deployed MinIO (see infra/COOLIFY.md).
#
# Needs: MC_HOST_local (alias URL with creds baked in, e.g.
# "http://user:pass@endpoint:9000") or MINIO_ROOT_USER/MINIO_ROOT_PASSWORD +
# MINIO_ENDPOINT set instead. S3_BUCKET/S3_KEY_PREFIX match the app's own env.
set -eu

ENDPOINT="${MINIO_ENDPOINT:-http://minio:9000}"
BUCKET="${S3_BUCKET:-sbmj-erp}"
PREFIX="${S3_KEY_PREFIX:-testing}"

mc alias set local "$ENDPOINT" "$MINIO_ROOT_USER" "$MINIO_ROOT_PASSWORD"
mc mb --ignore-existing "local/$BUCKET"
# Anonymous READ only, scoped to the testing prefix — not the whole bucket,
# so a future non-test prefix in the same bucket stays private by default.
mc anonymous set download "local/$BUCKET/$PREFIX"

echo "✓ MinIO ready: bucket=$BUCKET, public prefix=$PREFIX/"
