# Postgres for the SBMJ ERP — adds pg_cron to the official image.
# pg-boss needs no extension (plain tables); pg_cron must be preloaded.
FROM postgres:17

# Install pg_cron for the matching major version.
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-17-cron \
    && rm -rf /var/lib/apt/lists/*

# pg_cron must be in shared_preload_libraries; this runs as the server command.
# (docker-compose passes the same via `command:` — keep them in sync.)
CMD ["postgres", "-c", "shared_preload_libraries=pg_cron", "-c", "cron.database_name=sbmj_erp"]
