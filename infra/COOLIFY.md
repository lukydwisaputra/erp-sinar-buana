# Deploying to Coolify — testing environment, start to finish

4 resources: **Postgres, MinIO, App, Worker**. This is a testing-environment
deploy (real demo data carried over, one Coolify domain + Let's Encrypt
instead of the Cloudflare Tunnel `docs/architecture.md` specs for real
production) — see "Deliberately deferred" at the bottom for exactly what
that means and what to revisit before real client data goes in.

## 0. Prerequisites

- A Coolify server, with this repo pushed somewhere Coolify can pull from
  (GitHub/GitLab/etc., or a Coolify-visible Git remote).
- One domain (or subdomain) you can point DNS at Coolify for the app —
  e.g. `erp-test.yourdomain.com`. A second subdomain for MinIO is needed too
  (e.g. `minio-test.yourdomain.com`) — see step 2.
- `openssl` locally, to generate secrets:
  ```bash
  openssl rand -base64 32   # run twice — ENCRYPTION_KEY and INTERNAL_RENDER_SECRET
  ```

## 1. Postgres

**Resource → Dockerfile build pack**, `infra/postgres/Dockerfile`, repo root as build context, no public domain (internal only).

**Persistent storage**: mount a volume at `/var/lib/postgresql/data` — skipping
this means every redeploy wipes the database.

**Env vars:**
```
POSTGRES_DB=sbmj_erp
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<generate a strong one>
APP_DB_PASSWORD=<generate a strong one — the app LOGIN role's password>
```

Deploy this one first and let it finish booting before anything else — on
first boot (empty volume) it runs
[`infra/postgres/init/00-roles.sh`](postgres/init/00-roles.sh), which creates
the `auth` schema stub and the `authenticated`/`anon`/`service_role`/`app`
roles. Everything downstream (schema restore, app, worker) depends on this
having already run.

## 2. MinIO

**Resource → Docker Image** `minio/minio:latest` (no custom Dockerfile
needed), command: `server /data --console-address ":9001"`.

**Persistent storage**: mount a volume at `/data`.

**Env vars:**
```
MINIO_ROOT_USER=sbmj-minio
MINIO_ROOT_PASSWORD=<generate a strong one>
```

**Domain**: give this resource a public domain on port `9000` (the S3 API
port, not `9001`'s admin console) — e.g. `minio-test.yourdomain.com` — with
Coolify's Let's Encrypt TLS. This is what makes uploaded objects (the
company logo) directly viewable by a browser or fetchable when the worker
renders a PDF; without a public domain, only other Coolify-internal
resources could reach it.

### Bootstrap the bucket

Nothing exists on a fresh MinIO until you create the bucket + grant public
read on the testing prefix. Run
[`infra/scripts/minio-init.sh`](scripts/minio-init.sh) once, from anywhere
with Docker access to the public MinIO domain (your own machine is fine —
it only needs network access, not to be on Coolify's internal network):

```bash
docker run --rm \
  -e MINIO_ENDPOINT=https://minio-test.yourdomain.com \
  -e MINIO_ROOT_USER=sbmj-minio \
  -e MINIO_ROOT_PASSWORD=<the password you set above> \
  -e S3_BUCKET=sbmj-erp \
  -e S3_KEY_PREFIX=testing \
  -v "$(pwd)/infra/scripts/minio-init.sh:/minio-init.sh:ro" \
  --entrypoint /bin/sh \
  minio/mc:latest /minio-init.sh
```

Expect: `✓ MinIO ready: bucket=sbmj-erp, public prefix=testing/`. This
creates the `sbmj-erp` bucket and grants **anonymous read only on the
`testing/` prefix** — that's the "folder designated for testing": any object
key under `testing/...` is publicly downloadable, nothing else in the bucket
is. A future `production` prefix in the same bucket would stay private by
default.

## 3. App

**Resource → Dockerfile**, `Dockerfile` (repo root), repo root as build
context. **Domain**: this is the one resource with a public domain —
`erp-test.yourdomain.com`, Coolify Let's Encrypt TLS.

**Env vars:**
```
NODE_ENV=production
DATABASE_URL=postgres://app:<APP_DB_PASSWORD>@<postgres internal host>:5432/sbmj_erp
ENCRYPTION_KEY=<see the critical callout below>
SENTRY_DSN=<optional>

S3_ENDPOINT=https://minio-test.yourdomain.com
S3_PUBLIC_URL=https://minio-test.yourdomain.com
S3_ACCESS_KEY=sbmj-minio
S3_SECRET_KEY=<MinIO root password>
S3_BUCKET=sbmj-erp
S3_KEY_PREFIX=testing
```

> `S3_ENDPOINT` and `S3_PUBLIC_URL` are the same value here deliberately —
> using MinIO's public domain for both keeps this simple for a test deploy
> (the app's server-side upload calls just make one extra hop through
> Coolify's proxy). A real production setup would split these: `S3_ENDPOINT`
> pointed at MinIO's Coolify-internal hostname for server-side calls,
> `S3_PUBLIC_URL` kept as the public domain for anything a browser or an
> emailed PDF needs to fetch directly.

> **⚠️ `ENCRYPTION_KEY` must be the exact value already in your local
> `infra/.env`, not a freshly generated one.** It encrypts the Pengiriman SMTP
> password at rest. The seed dump (step 5) carries over an already-configured
> `email_accounts` row — restoring it under a *different* key means the app
> throws trying to decrypt that password the first time anything touches
> Pengiriman. Copy the value straight from your local `infra/.env`.

> **Internal hostnames** (for `DATABASE_URL`'s `<postgres internal host>`):
> Coolify assigns each resource its own internal DNS name on the project's
> private network — check the Postgres resource's "Networking" tab for its
> actual hostname once created (not literally `postgres` like local
> `docker-compose`).

## 4. Worker

**Resource → Dockerfile**, `infra/worker/Dockerfile`, repo root as build
context, **no public domain** (no HTTP surface — it's a queue consumer).

**Env vars:**
```
NODE_ENV=production
DATABASE_URL=postgres://app:<APP_DB_PASSWORD>@<postgres internal host>:5432/sbmj_erp
ENCRYPTION_KEY=<same value as App>
SENTRY_DSN=<same value as App, optional>
APP_URL=https://erp-test.yourdomain.com
INTERNAL_RENDER_SECRET=<generate — must match App's own copy exactly>
```

## 5. Restoring the seed data ("keep the data seed")

Not the mandatory config seed (`db-schema/sql/seed/00_seed.sql` — statuses,
categories, numbering formats; baked into a fresh schema regardless). This
is the actual local dev demo dataset — 21 companies, 11 projects, 24
quotations, 7 invoices, 20 employees, 6 user accounts — so the test
environment opens already populated instead of empty.

A dump was taken via [`infra/scripts/backup.sh`](scripts/backup.sh)
(`pg_dump --format=plain` — full schema + data, which *replaces* the need to
separately run `db-schema`'s `migrate:apply`, since the dump already
contains the complete current schema, RLS policies, triggers, and
functions, not just rows).

Restore it via Coolify's own terminal/SSH into the Postgres resource's
container (`infra/scripts/restore.sh` assumes a local `docker-compose`
Postgres and can't reach a Coolify-hosted one directly):

```bash
# Upload the dump file to the container first (Coolify's file manager, or
# `docker cp` if you have host access to wherever Coolify runs it), then:
gunzip -c /path/to/sbmj_erp_<timestamp>.sql.gz | psql -U postgres -d sbmj_erp -v ON_ERROR_STOP=1
```

The roles referenced by the dump's `GRANT` statements (`app`,
`authenticated`, `service_role`) must already exist — i.e. step 1's init
script must have already run before this restore, not after.

## 6. After restore — things that need reconfiguring

- **Pengiriman SMTP account** (Konfigurasi → Pengiriman) currently points at
  `localhost:1025` (MailDev — dev-only, not deployed here). Reconfigure it
  with a real SMTP account through the UI — see the cPanel walkthrough
  below. Email sending just queues/fails harmlessly until then; nothing else
  breaks.
- **Company logo** (Profil Perusahaan) was whatever was set in local dev, if
  anything — re-upload if you want a different one for this environment; it
  now goes through the real upload path (§7 below), not a mock.
- Stale `sessions` rows carried over from local dev are harmless dead rows
  (no one has those cookies for the new domain) — safe to ignore, or
  `truncate sessions;` for tidiness.

### Configuring email via cPanel

1. cPanel → Email → Email Accounts → Create a mailbox (e.g.
   `noreply@yourdomain.com`).
2. Open that account's **"Connect Devices"** page — cPanel shows the exact
   recommended SMTP settings. You want the outgoing (SMTP) block:
   - Host: `mail.yourdomain.com` (cPanel tells you the exact one)
   - Port: `465` (SSL, recommended) or `587` (STARTTLS) if 465 is blocked
   - Username: the full email address
   - Password: the mailbox password
3. In the app: Admin → **Konfigurasi → Pengiriman → Akun Email/SMTP** → fill
   in Host/Port/Username/Password + Nama Pengirim/Email Pengirim → the form
   tests the connection before letting you save.

## 7. Upload feature (company logo)

Wired end-to-end: `src/app/(app)/profil-perusahaan` → `POST
/api/company-profile/logo` (Admin-only, 5MB cap, PNG/JPG/WEBP/SVG) →
uploads to MinIO via `src/lib/storage/s3.ts` → returns a public URL under
`testing/logos/<uuid>.<ext>` → saved to `company_profile.logo_url` on
"Simpan Perubahan". Verified locally end-to-end (upload → MinIO → persisted
→ publicly fetchable) before writing this guide.

This is the only real upload feature so far. The `attachments` table exists
in the schema (tax entries, invoices, payslips, project comments) but has no
application code wired to it yet — a disclosed, separate gap, not part of
this pass.

## 8. Verify

```bash
curl https://erp-test.yourdomain.com/api/health   # {"status":"ok"}
```

Then log in with a restored account and:
- Click through a Proyek and a Faktur to confirm RLS/data came across intact.
- Profil Perusahaan → upload a logo → Simpan Perubahan → refresh the page —
  the logo should still be there (proves the MinIO round trip, not just a
  client-side preview).

## Deliberately deferred (revisit before this is *real* production, not a test)

- **Cloudflare Tunnel** — using Coolify's own domains + Let's Encrypt
  instead for both App and MinIO in this pass. Switch to a Tunnel (no open
  ports) per [`docs/architecture.md`](../docs/architecture.md) before real
  client data goes in.
- **Scoped MinIO credentials** — App/Worker use the MinIO root user/password
  directly. Fine for a test bucket; create a dedicated IAM user with access
  limited to the `sbmj-erp` bucket before this is real production.
- **Document-attachment uploads** (tax entries, invoices, payslips, project
  comments) — the `attachments` table and its RLS exist; no upload UI or API
  route does yet. A separate, larger feature than the logo upload built here
  (multiple record types, presigned direct-to-MinIO uploads for anything
  bigger than a logo, per the Cloudflare 100MB proxied-body cap noted in
  `docs/architecture.md` §6).
- **Scheduled backups** — `infra/scripts/backup.sh` exists but needs a
  Coolify Scheduled Task (or cron) wired to actually run it periodically;
  see [`infra/README.md`](README.md#backups).
- **Real `SENTRY_DSN`** — optional for a test pass; errors still land in
  Coolify's own container logs via Pino either way.
