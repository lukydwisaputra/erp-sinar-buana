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

## 5. Authentication (the one new build)

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

No schema, RLS, trigger, or numbering changes are required.

## 10. Open / deferred

- **Realtime:** deferred. TanStack Query refetch-on-focus + polling covers
  freshness; add a push mechanism only when a specific feature needs it.
- **Fastify:** deferred. Start with Next.js Route Handlers; extract a Fastify
  API service if/when server logic earns its own deployable.
- **Storybook:** deferred until the component library stabilizes.
