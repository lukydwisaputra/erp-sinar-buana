# One-off migration runner: psql + the drizzle-generated migration SQL.
# Built in CI, run manually on the box against the ERP DB when new
# migrations land (the app/worker images don't carry migration tooling).
#
# Build context is the repo root (see .github/workflows/deploy.yml).
FROM postgres:17

COPY db-schema/migrations /migrations
COPY infra/migrator/run.sh /run.sh
RUN chmod +x /run.sh

ENTRYPOINT ["/run.sh"]
