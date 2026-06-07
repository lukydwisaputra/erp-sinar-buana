# Infra — local & Coolify stack

Reference deployment for the 4-service architecture in
[`docs/architecture.md`](../docs/architecture.md): **Postgres** (data + RLS +
pg_cron + pg-boss), **MinIO** (S3 storage), **App** (Next.js), **Worker**
(pg-boss consumer).

## Local development

```bash
cp infra/.env.example infra/.env      # fill in passwords
docker compose -f infra/docker-compose.yml up -d postgres minio
```

First boot runs [`postgres/init/00-roles.sql`](postgres/init/00-roles.sql),
which creates the `auth` stub (`auth.users`, `auth.uid()`), the
`authenticated` / `anon` / `service_role` roles, and the `app` LOGIN role — the
"Non-Supabase Postgres" prerequisites from
[`db-schema/README.md`](../db-schema/README.md).

Then apply the schema (from `db-schema/`, in the documented order):

```bash
cd db-schema && npm install
export DATABASE_URL="postgres://postgres:<POSTGRES_PASSWORD>@localhost:5432/sbmj_erp"
npm run generate              # only if schema changed
psql "$DATABASE_URL" -f migrations/0000_init.sql
# ... then sql/00_auth_link.sql, indexes, triggers/, rls/, seed/ (see that README)
```

MinIO console: http://localhost:9001 · S3 API: http://localhost:9000.

The `app` and `worker` services are commented in the compose file until their
Dockerfiles exist.

## Coolify notes

- Deploy each service as its own resource; **put Cloudflare (Tunnel) in front of
  `app` only**. Postgres and MinIO stay on the internal network — no public ports.
- The `5432`/`9000`/`9001` port mappings here are **dev-only**; remove them in
  the Coolify definitions.
- Schedule a periodic `pg_dump` for backups
  ([NFR Bab 13](../planning/prd/13-non-fungsional.md)).
- Large uploads use **presigned multipart** to MinIO so each part stays under
  Cloudflare's 100 MB proxied-body cap.
