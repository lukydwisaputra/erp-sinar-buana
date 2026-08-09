# Postgres for the SBMJ ERP — adds pg_cron to the official image.
# pg-boss needs no extension (plain tables); pg_cron must be preloaded.
FROM postgres:17

# Install pg_cron for the matching major version.
RUN apt-get update \
    && apt-get install -y --no-install-recommends postgresql-17-cron \
    && rm -rf /var/lib/apt/lists/*

# Baked in, not just bind-mounted (docker-compose.yml also bind-mounts the
# same dir locally — harmless overlay, same file either way). A standalone
# `docker build` of this Dockerfile (e.g. Coolify, which doesn't go through
# docker-compose) needs the script actually present in the image, or
# /docker-entrypoint-initdb.d/ is empty and the roles/auth-stub setup never
# runs on first boot.
COPY infra/postgres/init/ /docker-entrypoint-initdb.d/

# Coolify Scheduled Task target — see infra/postgres/backup.sh's header and
# COOLIFY.md for the schedule setup. Needs a persistent volume at /backups
# (docker-compose.yml's pg_backups; on Coolify add an equivalent Storage
# mount) or every backup is lost on the next redeploy.
COPY infra/postgres/backup.sh /usr/local/bin/backup.sh
RUN chmod +x /usr/local/bin/backup.sh

# pg_cron must be in shared_preload_libraries; this runs as the server command.
# (docker-compose passes the same via `command:` — keep them in sync.)
CMD ["postgres", "-c", "shared_preload_libraries=pg_cron", "-c", "cron.database_name=sbmj_erp"]
