# Infra — local & Coolify stack

Reference deployment for the architecture in
[`docs/architecture.md`](../docs/architecture.md): **Postgres** (data + RLS +
pg-boss), **MinIO** (S3 storage), **App** (Next.js), **Worker** (pg-boss
consumer), plus **MailDev** (dev-only SMTP catcher, never deployed).

> The Postgres image still installs `pg_cron` (docs/architecture.md originally
> planned periodic SQL jobs through it), but nothing in `db-schema/` actually
> calls it — the one periodic job that exists (`mark_overdue_tax_entries`) runs
> via pg-boss's own `.schedule()` instead (`scripts/worker.ts`), found while
> building the migration runner. Not removed here since it's harmless as
> installed-but-unused, just worth knowing before reaching for `cron.schedule`
> and finding nothing already there.

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

Then apply the schema:

```bash
cd db-schema && npm install
DATABASE_URL="postgres://postgres:<POSTGRES_PASSWORD>@localhost:5434/sbmj_erp" npm run migrate:apply  # 5434, see below
```

One command, in the right order (see [`db-schema/README.md`](../db-schema/README.md)
for exactly what it runs) — replaces the previous "manually run ~12 `psql -f`
commands in a specific order" process.

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

### Running the full stack (app + worker) in Docker

Day-to-day iteration is usually faster with `npm run dev` / `npm run worker`
on the host against the `postgres`/`minio`/`maildev` containers above. To
run the whole stack the way Coolify would (built images, not the host
toolchain):

```bash
docker compose -f infra/docker-compose.yml up -d --build
```

Builds `app` ([`../Dockerfile`](../Dockerfile), multi-stage, `next.config.ts`'s
`output: "standalone"`) and `worker` ([`worker/Dockerfile`](worker/Dockerfile) —
also installs Chromium, needed for the PDF-attachment rendering pipeline).
Both need `ENCRYPTION_KEY` and `INTERNAL_RENDER_SECRET` set in `infra/.env`
(generate each with `openssl rand -base64 32`) — see `.env.example`.

- **App**: http://localhost:3000, health check at `/api/health` (also the
  Docker `HEALTHCHECK` target — no auth, just a `select 1`).
- **Worker**: no HTTP surface (a queue consumer). Check liveness via
  `docker compose logs -f worker`, or by watching for `document_deliveries`
  rows stuck in `queued` for longer than expected.

> **Building `app` needs ~4GiB free for the Docker build VM.** `next build`'s
> TypeScript-checking pass got `SIGKILL`ed (OOM) under Colima's 2GiB default
> on the 8GB dev machine this was built on — Turbopack compilation itself
> finished fine (84s), it's specifically the typecheck worker that's memory-hungry.
> Bump the VM before building: `colima stop && colima start --memory 4`
> (Docker Desktop: Settings → Resources → Memory). The `Dockerfile`'s builder
> stage also sets `NODE_OPTIONS=--max-old-space-size=3072` as a second line of
> defense so V8 GCs under pressure instead of growing unbounded — keep both if
> deploying to a similarly small VPS.

### Backups

```bash
BACKUP_DIR=/var/backups/sbmj-erp infra/scripts/backup.sh    # pg_dump + gzip, prunes after 14 days
infra/scripts/restore.sh <path-to-dump.sql.gz>               # drops + recreates the DB, asks for confirmation
```

`infra/scripts/backup.sh` is the host-side version (`docker compose exec`) —
schedule it with cron for local/self-managed setups (see the script's own
header for an example line).

On Coolify, use `infra/postgres/backup.sh` instead — it's baked into the
Database image (`/usr/local/bin/backup.sh` in the running container) since
Coolify Scheduled Tasks execute inside the target resource, not on the host.
Needs a persistent volume at `/backups` first (`docker-compose.yml`'s
`pg_backups` volume for local parity — on Coolify add an equivalent Storage
mount, or every backup is lost on the next redeploy) — see
[`COOLIFY.md`](COOLIFY.md)'s Known Gaps section for the exact Scheduled Task
setup.

## Coolify notes

> **First deploy (testing environment)?** See
> [`COOLIFY.md`](COOLIFY.md) for the concrete step-by-step: 4 resources
> (Postgres/MinIO/App/Worker), exact env vars, deploy order, bucket
> bootstrap, and how to carry the existing local demo data over as the test
> environment's seed instead of starting from an empty database.

- Deploy each service as its own resource; for **real production**, put
  Cloudflare (Tunnel) in front of `app` (and MinIO, since uploaded objects
  need to stay publicly fetchable) — Postgres stays internal-only, no public
  port. `COOLIFY.md`'s testing-environment pass uses Coolify's own
  domains + Let's Encrypt instead, as a deliberate simplification; switch to
  the Tunnel before real client data goes in. The `worker` never needs a
  public port either way (it only makes outbound calls: to Postgres, to
  `app`'s internal `/print/**` routes, to MinIO, and to SMTP).
- The `5434`/`9000`/`9001` port mappings here are **dev-only**; remove them in
  the Coolify definitions (Coolify assigns its own domains/ports instead).
- Schedule `infra/postgres/backup.sh` (baked into the Database image) as a
  Coolify Scheduled Task for Postgres backups
  ([NFR Bab 13](../planning/prd/13-non-fungsional.md)) — see above.
- **Company-logo upload** is wired to MinIO (`src/lib/storage/s3.ts`,
  `POST /api/company-profile/logo`) — small server-proxied uploads, not the
  presigned-multipart flow. Presigned direct-to-MinIO uploads (needed once
  larger document attachments are built, to stay under Cloudflare's 100MB
  proxied-body cap) remain a disclosed, separate gap.
