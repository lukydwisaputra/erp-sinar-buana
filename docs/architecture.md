# Sinar Buana ERP — Architecture & Tech Stack

> Status: **accepted** · Last updated: 2026-06-07
>
> Source of truth for the technology choices and the runtime architecture of the
> **PT Sinar Buana Mandiri Jaya (SBMJ)** ERP. Pairs with the data model in
> [`db-schema/`](../db-schema/README.md) and the product spec in
> [`planning/prd/`](../planning/prd/README.md).

## 1. Context & goals

SBMJ — an environmental-permit consultancy — needs a **single-tenant internal
ERP** (quotations → projects → installment billing → cashflow/payroll/tax),
self-hosted on **Coolify** behind **Cloudflare**. Users are a fixed staff roster
(no public signup); the UI is Bahasa Indonesia, desktop & tablet
([NFR Bab 13](../planning/prd/13-non-fungsional.md)).

Design priorities, in order:

1. **Lean & maintainable** — the fewest moving parts a small team can operate.
2. **Postgres is the backbone** — anything that can live in Postgres does (data,
   authorization, scheduled jobs, the work queue) instead of adding sidecar
   services.
3. **Respect existing work** — the `db-schema` (RLS, triggers, numbering, audit)
   ships unchanged.
4. **Cost-effective & self-hostable** — no managed-service lock-in for core data.

A deliberate consequence: **Supabase was dropped entirely.** Only Postgres, Auth
and Storage were ever used, and operating the trimmed Supabase bundle (Kong +
key management + compose) to use a fraction of it is the heaviest-maintenance
option. We use plain Postgres, self-built auth, and MinIO instead.

## 2. Runtime topology — 4 services on Coolify

```
                         ┌──────────────────────────┐
                         │  Cloudflare (DNS + WAF)   │
                         │  + Tunnel (no open ports) │
                         └────────────┬─────────────┘
                                      │ TLS
              ┌───────────────────────┼───────────────────────┐
              ▼                                               ▼
      ┌───────────────┐                              ┌────────────────┐
      │  App (Next.js)│  UI + API (Route Handlers)   │  MinIO         │
      │  + auth        │  presigned URLs ────────────▶│  (S3 storage)  │
      └───────┬───────┘                              └────────────────┘
              │ SQL (per-request tx: set local app.user_id)
              ▼
      ┌───────────────────────────────────────────────┐
      │  PostgreSQL                                     │
      │  • app data + RLS (RBAC)   • audit / numbering  │
      │  • pg_cron (periodic SQL)  • pg-boss queue      │
      └───────────────────────────────────────────────┘
              ▲ SQL (service_role for jobs)
              │
      ┌───────┴───────┐
      │  Worker (Node)│  pg-boss consumer: email, PDF, reminders
      └───────────────┘
```

| # | Service | Role |
| --- | --- | --- |
| 1 | **PostgreSQL** | Data + RLS + audit/triggers + `pg_cron` + `pg-boss` queue tables |
| 2 | **MinIO** | S3-compatible file storage (PDF docs, attachments) |
| 3 | **App** (Next.js) | UI, API (Route Handlers), authentication |
| 4 | **Worker** (Node) | Long-running `pg-boss` consumer for app jobs |

Edge: **Coolify** (PaaS/deploy) · **Cloudflare + Tunnel** (free TLS, DDoS/WAF,
no open ports). Postgres backups run as a scheduled `pg_dump` (Coolify) — see
[NFR backup requirement](../planning/prd/13-non-fungsional.md).

## 3. Tech stack

### Frontend
TypeScript · **Next.js** (App Router) · **shadcn/ui + Tailwind** · **TanStack
Query** (server state) · **Zustand** (minimal client/UI state) · **`ky`** (one
shared instance: base URL, session cookie, error normalization) · **React Hook
Form + Zod** (schemas shared with the backend) · **TanStack Table** · **Motion**
· next-themes, date-fns · **Vitest** (unit/component) + **Playwright** (E2E) ·
**Storybook** (deferred until the component library stabilizes).

### Backend
Node.js (LTS) · **API via Next.js Route Handlers** (extract a Fastify service
only when server logic outgrows it) · **Zod** validation · **Pino** logging ·
**Drizzle** for the `public` schema + hand-written SQL for RLS/triggers
(migrate, never `push` — see [db-schema README](../db-schema/README.md)).

| Concern | Decision |
| --- | --- |
| Database | Plain **PostgreSQL**, self-hosted on Coolify |
| Authorization | **RLS-via-app** (see §4) |
| Auth | **Self-built, session-based** (see §5) |
| File storage | **MinIO** via `@aws-sdk/client-s3` + presigned URLs (see §6) |
| Periodic SQL jobs | **pg_cron** |
| App jobs / queue | **pg-boss** (Postgres-backed — no Redis) |
| Email | **Resend + React Email** (sent from the worker) |
| Error tracking | **GlitchTip / Sentry free hosted tier** (not self-hosted) |

### Removed vs. the original proposal (redundancy eliminated)
Redis + BullMQ → pg-boss · Supabase Edge Functions → gone · Supabase Realtime →
deferred · PostgREST + Kong → gone (Next.js is the API) · Jest → Vitest ·
self-hosted GlitchTip → hosted free tier · second API service → deferred ·
**all of Supabase** → plain Postgres + MinIO + self-built auth.

## 4. Authorization — RLS-via-app

RLS is the **single source of truth** for row access; it implements the RBAC
matrix already authored in [`db-schema/sql/rls/`](../db-schema/README.md). It is
load-bearing for API traffic, not decorative.

Every request that serves user data runs inside a **transaction** that adopts the
caller's identity, exactly as PostgREST would:

```sql
BEGIN;
SET LOCAL ROLE authenticated;
SET LOCAL app.user_id = '<authenticated user uuid>';   -- auth.uid() reads this
-- ... queries; RLS policies apply ...
COMMIT;
```

- `auth.uid()` resolves from `current_setting('app.user_id')` (the
  non-Supabase stub documented in the db-schema README).
- `SET LOCAL` is transaction-scoped, so a connection pooler in **transaction
  mode** is safe.
- **`service_role`** (which has `bypassrls`) is used **only** on explicitly
  marked paths: cross-user reporting/dashboards, admin tooling, and the
  background worker. Those paths are the exception and must be named as such.
- Existing automation triggers run `SECURITY DEFINER` and already bypass RLS —
  consistent with this model.

This keeps RBAC defined once (in SQL) and avoids re-deriving it in TypeScript.
Server-side enforcement satisfies
[FR-01.8 / GC-12](../planning/user-stories/01-autentikasi-akun.md).

## 5. Authentication (the first module wired to real Postgres)

No public signup — accounts are **admin-created and invite-activated**
([EP-01](../planning/user-stories/01-autentikasi-akun.md)). Session-based, not
JWT, because the RLS model only needs `app.user_id` and sessions are revocable.

- **Password hashing:** argon2id (`@node-rs/argon2`).
- **Sessions:** opaque token in an `httpOnly`, `Secure`, `SameSite=Lax` cookie;
  a `sessions` table in Postgres (revocable; deactivating an account kills its
  sessions — [FR-01.6/01.9](../planning/user-stories/01-autentikasi-akun.md)).
- **Primitives:** Oslo (`oslo/password`, `oslo/crypto`) + our own session table —
  no heavy auth framework.
- **Invitation & reset tokens:** single-use, expiring rows; sent via Resend.
  ([US-01.2 / US-01.4](../planning/user-stories/01-autentikasi-akun.md)).
- **Account ↔ employee:** 1:1, written into `auth.users` (which `user_profiles`
  already 1:1-extends in the schema).
- **Hardening:** anti-enumeration login errors, rate-limit login & reset
  ([Edge Cases, EP-01 §7](../planning/user-stories/01-autentikasi-akun.md)).
- **RBAC middleware:** every Route Handler resolves the session → role, enforces
  permission server-side, then opens the RLS transaction (§4).

> Hard delete is forbidden anywhere — accounts are **deactivated**
> ([BR-13](../planning/user-stories/11-konvensi-global-nfr.md)).

## 6. File storage — MinIO

S3-compatible storage on Coolify, accessed with `@aws-sdk/client-s3`.

- **Uploads/downloads use presigned URLs** so bytes flow browser ↔ MinIO
  directly, off the app server.
- **Multipart upload** keeps each part under Cloudflare's 100 MB proxied-body
  cap, so large attachments work through the tunnel with no open ports.
- App stores object keys + metadata in Postgres (`attachments` table); access is
  gated by issuing presigned URLs only after the RLS/RBAC check passes.

## 7. Background work

| Need | Mechanism | Examples |
| --- | --- | --- |
| Pure-SQL periodic | **pg_cron** | `mark_overdue_tax_entries`, monthly numbering resets |
| App jobs (need Node) | **pg-boss** | Resend emails, invoice/SPH PDF rendering, H-3 due reminders, notification fan-out |

- Both are Postgres-backed — **no Redis**.
- App-side side effects are **enqueued inside the request's transaction** (the
  app performs the write *and* enqueues the job), not fired from DB triggers, so
  effects are observable, testable, and retryable.
- The worker connects as `service_role` (it acts system-wide) — a marked
  exception per §4.

## 8. Observability

- **Logging:** Pino structured logs (shipped via Coolify).
- **Errors:** GlitchTip/Sentry **free hosted tier** — error events are not
  business data, so off-infra is acceptable and saves running a service.
- **Audit:** the DB-level `audit_log` (triggers) already records who/when for
  finance-sensitive entities ([NFR Bab 13](../planning/prd/13-non-fungsional.md)).

## 9. How this fits the existing `db-schema`

The schema is **already compatible** — its README documents the "Non-Supabase
Postgres" path:

- `auth` schema stub, `auth.users`, `auth.uid()` reading
  `current_setting('app.user_id')`, and the `authenticated` / `anon` /
  `service_role` roles.
- The auth module (§5) writes users into `auth.users`; `user_profiles` extends
  it 1:1.
- The app sets `app.user_id` per transaction → `auth.uid()` resolves → RLS
  behaves identically to a Supabase deployment.

Auth itself needed no schema/RLS/trigger changes. Wiring a module beyond auth
does sometimes need small additive migrations, though — Perusahaan (the
second module wired, see [PRD Bab 3.1](../planning/prd/03-master-data.md))
needed `companies.is_active` and `company_contacts.position` added, since the
~10-month-old `db-schema` design had drifted from the frontend prototype in
every module by the time any of them got wired for real (see
`planning/prd/03-master-data.md` for the reconciled Perusahaan shape). Each
module's wiring pass is expected to re-check its own tables against the
current mock/PRD shape rather than assume `db-schema` is still accurate.

Karyawan (the third module wired) needed **no migration at all** — `employees`,
`employee_salary_components`, and all 8 of Konfigurasi's "Daftar Pilihan"
lookup tables (`positions`, `employment_statuses`, `salary_components`,
`document_types`, `authorities`, `legal_bases`, `admin_areas`, `bank_accounts`)
already existed with correct RLS, and 6 of the 8 lookup tables already had
seed rows (`db-schema/sql/seed/00_seed.sql`). Karyawan's `jabatan`/
`statusKepegawaian` are real FK references into those lookup tables, so
wiring it pulled Konfigurasi's Daftar Pilihan tab (all 8 categories, not just
the 3 Karyawan needs) forward into the same pass rather than leaving it mock
— see `planning/prd/03-master-data.md` §3.3 for the reconciled Karyawan
shape. This is the opposite lesson from Perusahaan: sometimes a module's
wiring pass turns out to be schema-clean but has a hard dependency on
another still-mock module's backend, which should be pulled forward too
rather than built against a shared mock.

Penawaran (the fifth module wired, after Katalog Layanan) needed the largest
reconciliation so far — three genuine schema gaps, not just missing columns:

- **RAB/Jadwal granularity.** The app tracks RAB (`quotation_rab_personnel`/
  `quotation_rab_direct_costs`) and Jadwal (`activity_schedules` + its two
  child tables) **per SPH line item**, but those tables only keyed off
  `quotation_id`. Added a nullable `quotation_item_id` FK to all three parent
  tables (migration `0005`) rather than flattening the app's per-item UI down
  to the DB's per-quotation granularity.
- **Missing document fields.** `quotations` was missing 8 columns the SPH
  document/cover-letter actually needs: `opening_sentence`, `attachment_note`,
  `recipient_title`, `rincian_active`, `ppn_active`/`ppn_percent`,
  `pph23_active`/`pph23_percent`, and the PIC override triplet (migration
  `0006`), plus `quotation_items.unit` (migration `0007`) found while wiring
  the mapping layer. All added as nullable/defaulted columns, not a jsonb
  catch-all, so they stay queryable and typed like every other column.
- **Status reconciliation.** `quotations.status_id` is a real FK into
  `workflow_statuses` (entity='penawaran'), which only had 4 seed rows
  (Draft/Leads-Terkirim/Convert-Deal/Batal). The app's 5-value status enum
  needed a 5th, distinct "Ditolak" — topped up idempotently by
  `scripts/seed-penawaran.ts` rather than touching Konfigurasi's own
  (still-mock) Workflow Status tab. `src/lib/penawaran/mapping.ts` translates
  the app enum ↔ real `workflow_statuses.label` at the boundary, so the UI's
  enum-based business logic (`sph.ts`, `StatusBadge`) didn't need a rewrite.

Converting an SPH to "Deal" only updates the real `quotations.status_id` —
it does **not** cascade into real `projects`/`master_invoices` rows, since
Proyek and Faktur aren't wired yet. That cascade stays mocked
(`src/lib/data/penawaran.ts`, kept for the still-mock Proyek/Faktur/Dasbor
consumers) until those modules get their own wiring pass. See
`planning/prd/04-penawaran-sph.md` for the reconciled Penawaran shape.

## 10. Open / deferred

- **Realtime:** deferred. TanStack Query refetch-on-focus + polling covers
  freshness; add a push mechanism only when a specific feature needs it.
- **Fastify:** deferred. Start with Next.js Route Handlers; extract a Fastify
  API service if/when server logic earns its own deployable.
- **Storybook:** deferred until the component library stabilizes.
