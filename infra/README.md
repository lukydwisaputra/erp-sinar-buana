# Infra — local & Coolify stack

Reference deployment for the architecture in
[`docs/architecture.md`](../docs/architecture.md): **Postgres** (data + RLS +
pg_cron + pg-boss), **MinIO** (S3 storage), **App** (Next.js), **Worker**
(pg-boss consumer), plus **MailDev** (dev-only SMTP catcher, never deployed).

## Local development

```bash
cp infra/.env.example infra/.env      # fill in passwords
docker compose -f infra/docker-compose.yml up -d postgres minio maildev
```

First boot runs [`postgres/init/00-roles.sh`](postgres/init/00-roles.sh),
which creates the `auth` stub (`auth.users`, `auth.uid()`), the
`authenticated` / `anon` / `service_role` roles, the `app` LOGIN role (password
from `APP_DB_PASSWORD`) with default table grants for anything `db-schema`'s
migrations create afterward — the "Non-Supabase Postgres" prerequisites from
[`db-schema/README.md`](../db-schema/README.md).

Then apply the schema (from `db-schema/`, in the documented order):

```bash
cd db-schema && npm install
export DATABASE_URL="postgres://postgres:<POSTGRES_PASSWORD>@localhost:5434/sbmj_erp"  # 5434, see below
npm run generate              # only if schema changed
for f in migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done
# ... then sql/00_auth_link.sql, indexes, triggers/, rls/, seed/ (see that README)
```

> **Port 5434, not 5432.** The compose file maps the container's Postgres to
> host port `5434` by default (`POSTGRES_HOST_PORT` in `infra/.env`) instead
> of the standard `5432`. Found 2026-07-03: a machine with another local
> Postgres already listening on 5432 will silently intercept connections to
> `localhost:5432` meant for this container — `docker exec` into the
> container still works (separate network namespace), but anything
> connecting from the host over the published port silently talks to the
> wrong server, which is a confusing failure to debug. Override
> `POSTGRES_HOST_PORT` in `infra/.env` if `5434` is also taken.

Then, from the app root, create `.env.local` (see `.env.example`) pointing
`DATABASE_URL` at the `app` LOGIN role (not `postgres`), and bootstrap the
first Admin account (EP-01's chicken-and-egg — normally Admin invites
everyone else):

```bash
npm run seed:admin
```

MinIO console: http://localhost:9001 · S3 API: http://localhost:9000.

**Pengiriman's dev SMTP account** (Konfigurasi → Pengiriman → Akun Email/SMTP):
`host=localhost, port=1025`, any username/password, e.g.
`fromEmail=noreply@sbmj.local`. MailDev accepts any credentials unauthenticated
— caught mail is visible at http://localhost:1080. Run `npm run worker`
(`scripts/worker.ts`) in its own terminal to actually process queued email
deliveries against it.

The `app` and `worker` services are commented in the compose file until their
Dockerfiles exist.

## Coolify notes

- Deploy each service as its own resource; **put Cloudflare (Tunnel) in front of
  `app` only**. Postgres and MinIO stay on the internal network — no public ports.
- The `5434`/`9000`/`9001` port mappings here are **dev-only**; remove them in
  the Coolify definitions.
- Schedule a periodic `pg_dump` for backups
  ([NFR Bab 13](../planning/prd/13-non-fungsional.md)).
- Large uploads use **presigned multipart** to MinIO so each part stays under
  Cloudflare's 100 MB proxied-body cap.
