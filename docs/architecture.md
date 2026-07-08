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
| Email | **nodemailer over admin-configured SMTP** (sent from the worker) — a deliberate deviation from the original Resend plan, made when Pengiriman was wired (§7); Resend's single-API-key model doesn't fit the already-built "Akun Email/SMTP" UI, which lets Admin configure any mail server (host/port/username/password, AES-256-GCM-encrypted at rest) rather than a fixed provider |
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
- **Invitation & reset tokens:** single-use, expiring rows. Still a
  pre-existing gap as of the Pengiriman pass (§7) — actual delivery isn't
  wired for this specific flow (invite/reset links are shown directly in the
  Admin UI instead, not emailed); the real SMTP/queue pipeline built for
  Pengiriman would be the natural mechanism if this gets picked up later.
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
| App jobs (need Node) | **pg-boss** | Pengiriman emails (nodemailer over admin-configured SMTP), invoice/SPH PDF rendering, H-3 due reminders, notification fan-out |

- Both are Postgres-backed — **no Redis**.
- App-side side effects are **enqueued inside the request's transaction** (the
  app performs the write *and* enqueues the job), not fired from DB triggers, so
  effects are observable, testable, and retryable.
- The worker connects as `service_role` (it acts system-wide) — a marked
  exception per §4.

**Pengiriman is the first background job actually built** (2026-07-08,
`scripts/worker.ts`) — see the Pengiriman module writeup below for the
"outbox-lite" simplification actually shipped (enqueue immediately *after* the
transaction commits, not literally inside it — pg-boss's own connection pool
is separate from the app's per-request Drizzle transaction, and no verified
API exists for true co-transactional enqueue). The worker is standalone (no
`@/` import alias — only Next's bundler resolves that), reimplementing
`withServiceRole`'s `set local role service_role` locally with a plain
`postgres()` client, same convention as `scripts/seed-*.ts`.

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

Proyek (the sixth module wired) needed the largest reconciliation of any
module so far — three real schema gaps plus two scope-expansion decisions
made with the user up front (a Gantt/timeline view and Realisasi RAB, both
originally separate follow-ups, pulled into this same pass):

- **Milestone nesting.** `milestones` had no self-referencing `parent_id` —
  the detail view's milestone tree needs it (migration `0008`, `onDelete:
  cascade` — deleting a parent now cascades to children/their comments at
  the DB level, replacing the mock's manual recursive-descendant walk).
- **Milestone assignees are genuinely multi-select** (verified by reading
  the component directly, not assumed) — added a `milestone_assignees` join
  table rather than using the existing single `assigneeEmployeeId` column,
  which stays unused. The mock's picker also allowed assigning a company PIC
  to a milestone; that option is dropped (employees only) as a disclosed
  scope cut — a milestone assignee is internal staff per the PRD, and
  company PICs are already shown separately via `PerusahaanPic`.
- **`milestones.description`/`project_comments.milestone_id` were both
  missing** — the mock's real "Deskripsi" textarea and per-milestone
  activity feed had no DB columns to write to (migration `0008` again).
- **Status became fully config-driven.** The mock shipped a hardcoded
  5-value Proyek enum and 4-value Milestone enum with fixed transitions/
  colors, matching neither the PRD's actual 7-stage process
  (PO/Kontrak→…→Selesai/Batal) nor the DB's already-seeded
  `workflow_statuses` rows for `entity='proyek'`/`entity='milestone'`. Status
  is now a live dropdown sourced from `workflow_statuses` with no client-side
  gating (same free-dropdown pattern as Penawaran) — automation (e.g.
  Dasbor's "active project" filter) keys off `system_role`
  (`SELESAI`/`BATAL`), never the label, since labels are user-renameable.
- **Gantt/timeline (new capability).** `activity_schedules` already had a
  nullable `project_id` column and `activity_schedule_rows.milestone_id`
  from the original db-schema design ("Attached to a quotation, a project,
  or both, after Deal") — the app just never built a UI for it.
  Converting an SPH to a project now **re-points the same schedule rows**
  Penawaran wrote (`UPDATE activity_schedules SET project_id = ...`) rather
  than duplicating them; `activity_schedule_marked_weeks.isActual` (0=
  rencana/1=aktual) was written but never read as `1` until now — the new
  Gantt view overlays both, with actual-progress marking as a small
  incremental toggle endpoint rather than Penawaran's full delete-reinsert
  (ongoing week-by-week marking doesn't fit a wholesale-replace model).
- **Realisasi RAB (new capability, pulled forward).** Its own small module
  (own schema/fixtures/query files, `rab_actuals` table) with almost-matching
  but not identical columns — added `rab_actuals.rab_line_label` (the mock's
  free-text RAB-line identifier had no DB equivalent, only a generic `note`).
  `cashflow_entry_id` stays unlinked (Arus Kas isn't wired).

Dropped without replacement (documented, not silently lost): the mock's
fine-grained per-field activity log ("Status diubah: X → Y", "Assignee
diubah", …) has no DB equivalent — real automatic history is limited to
`project_status_log` (project-level status changes only, trigger-written,
`SECURITY DEFINER`, the app never inserts into it directly). Milestone
description/comment attachments (drag-and-drop, blob-URL only in the mock)
are dropped entirely — no real object storage wired for this module.
`@mention` parsing/notifications, milestone-template auto-loading on project
creation, and recurring Laporan Semester auto-generation are all deferred
(PRD-described, unimplemented in the mock, and out of scope for this pass).
See `planning/prd/06-manajemen-proyek.md` for the reconciled Proyek shape.

Faktur (the seventh module wired) needed the largest *conceptual* gap of any
module so far — not missing columns, but a mock that modeled the whole
domain flat (one `Faktur` row per termin, keyed only by `sphId`, the entire
proposed term scheme duplicated onto every row) where the DB had already
normalized it correctly as **Proyek → Faktur Induk (`master_invoices`) →
Invoice Termin (`installment_invoices`)**:

- **Adopted the DB's 3-level hierarchy** rather than flattening it to match
  the mock — a genuine from-scratch build, since the mock's own "create
  faktur" flow was dead code (`createFakturSetFromSph` had zero call sites,
  `FakturBuilder`'s new-faktur path was a no-op toast stub). Faktur Induk is
  now created explicitly from a Proyek (pick services + a term scheme), and
  Invoice Termin are generated **one at a time, in order** — not all upfront
  like the mock did.
- **Trust the DB triggers entirely**, the same precedent Penawaran
  (numbering) and Proyek (`fn_project_status_log`) established: numbering
  (`assign_document_number('INV')`), the over-billing guard
  (`fn_installment_validate`, Σ termin ≤ Total Biaya), and payment automation
  (`fn_installment_after_change` — on LUNAS, creates the 3 locked
  `cashflow_entries` rows [jasa/PPN Keluaran/PPh23 dipotong] + `tax_entries`
  rows and rolls the master invoice up once fully paid; on BATAL, reverses
  them) are never duplicated app-side. One real bug this surfaced during
  curl verification: postgres-js/drizzle wrap a raised exception's message
  under `error.cause`, not the top-level `Error.message` — the guard's 409
  mapping in `src/lib/faktur/service.ts` was matching the wrong field and
  silently falling through to a 500 until fixed.
- **Tax is a snapshot, not live.** The mock recomputed PPN/PPh23 at render
  time from toggles on the flat row; the DB stores it once, at
  termin-generation time (`dpp`/`ppn`/`pph23`/`total_after_tax` columns) —
  correct per the PRD, and immutable even if rates change later.
  `resolveTaxDefaults` inherits ppn/pph23 settings from the project's linked
  quotation when one exists, falling back to Penawaran's own schema defaults.
- **Milestone → Faktur Induk linkage** (`milestones.linked_master_invoice_id`,
  already declared in the schema from the Proyek pass but never given an app
  FK or any UI) is wired now: a picker in the milestone modal, plus a
  suggestion banner/button when a `triggersTerm` milestone reaches a
  `SELESAI`-system-role status — a UI nudge only, never automatic, matching
  the PRD's "sistem menyarankan, bukan otomatis."
- **Arus Kas and Pajak got a scoped read-only pass**, not a full wiring —
  since marking a termin Lunas writes real `cashflow_entries`/`tax_entries`
  rows regardless of whether those modules are "wired," both list pages now
  read real data (`src/lib/arus-kas/service.ts`, `src/lib/tax/service.ts`).
  Explicitly out of scope and dropped from both pages: manual-entry CRUD
  ("Tambah Transaksi"/"Tambah Kewajiban"), the settlement workflow
  (bukti-potong upload, NTPN, settle actions), forecast, and Tax Center
  config (`pajak-config` stays mock, unrelated to this pass). RLS already
  matched exactly: `cashflow_sel` includes viewer, `tax_sel` doesn't — the
  first read route in the app gated stricter than admin/keuangan/sales/tim_teknis/viewer.
- **Ripple fixes**, same "Dasbor rides along" precedent as every prior
  module: Perusahaan's `piutang` metric is a real sum of unpaid termin totals
  per company (`sumPiutangByCompanies`) instead of re-implementing the tax
  math over a frozen fixture array; Dasbor's revenue/forecast/alerts/
  profitability pure functions now take a flat `FakturTerminRow` (a
  `flattenTermins` adapter over `FakturInduk[]`) instead of the old mock
  `Faktur[]`, and `pendapatanPerSph` became `pendapatanPerProyek` (keyed by
  `proyekId`, which also works for manually-created projects with no linked
  SPH) — a genuine improvement, not just a rename. `getForekast` now depends
  on real service calls (DB access), so it moved behind
  `/api/dasbor/forecast` the same way `getAlerts`/`getProfitabilitas` already
  had to.

Dropped without replacement (documented, not silently lost): the mock's
draft/terkirim distinction on invoices doesn't exist anymore — generating a
termin at all creates a real, numbered invoice row, so "issued" now just
means "not cancelled." The two divergent id-generation schemes
(`src/lib/id-generator.ts`'s Hashids-based encoder, `src/lib/faktur-id.ts`'s
string-parsing `sphIdToInvBase`/`terminFakturId`, the latter already broken
against real UUID `sphId` values) are gone — real `masterInvoiceId`/
`installmentInvoiceId` lookups replace both, which also fixes a live bug
(`proyek/page.tsx`'s "Lihat Faktur" link previously produced a garbage id).
See `planning/prd/05-dokumen-bisnis.md` for the reconciled Faktur shape.

Penggajian (the eighth module wired) was the first pass where the DB side
was already fully built and correct from the very first migration —
`payslips`/`payslip_components`, the `fn_payslip_after_change()` trigger,
RLS (including a self-scoped read policy no prior module needed), and seed
data (3 `workflow_statuses` for `entity='penggajian'`, 5 `salary_components`
incl. BPJS) all pre-dated this pass. The work was concentrated almost
entirely in the app layer, plus one deliberate schema addition and one
deliberate scope expansion, both confirmed with the user up front:

- **"Batch" has no DB table** — the mock's `PenggajianBatch` grouping
  concept doesn't exist in the real schema (each `payslip` is the unit of
  record, no parent/batch FK anywhere). Rather than add one, batches are
  derived at read time by grouping live payslips on `(period_start,
  period_end)`, with a synthetic id (`GAJ-{periodStart}_{periodEnd}`) stable
  enough to use as a query key and URL segment. One small additive column,
  `payslips.planned_pay_date`, gives the mock's "Tanggal Bayar" a real home
  (`paid_date` only gets set once a slip is *actually* paid).
- **Payslip numbering was a genuine gap** — unlike SPH/Faktur,
  `payslips.number` existed but no trigger assigned it. Extended
  `assign_document_number()` to a 3rd doc type (`'GAJ'`, migration `0009`) —
  the function previously hardcoded `new.date` for its year/month
  extraction, which `payslips` doesn't have (only
  `period_start`/`period_end`/`paid_date`); it now branches per doc type so
  each table only ever touches a column its own row actually has, with
  SPH/Faktur's numbering behavior left byte-identical (curl-regression-
  tested after the edit).
- **Real line-item allowances/deductions** — the mock had 5 flat scalar
  fields (`tunjangan`/`lembur`/`bonus`/`pph21`/`bpjsPotongan`); the DB
  normalizes allowances/deductions as `payslip_components` rows. Rather than
  collapse them back to an aggregate (the Faktur precedent), this pass built
  a genuine editable line-item list (`ComponentsEditor`), prefilled from
  each employee's configured `employeeSalaryComponents` (percentage-type
  components computed against `baseEffective`) but fully add/remove/edit-
  able. `lembur`/`bonus`/`pph21` stayed as direct scalar inputs — they map
  straight to dedicated `payslips` columns, only allowances/deductions
  beyond those live as component rows.
- **Trust the DB trigger, taken to a new RBAC shape**: marking a slip
  Dibayar/Batal is a pure status `UPDATE`, `fn_payslip_after_change` handles
  all cashflow/tax-entry automation. RLS's non-Finance "read only your own
  payslip" policy is enforced entirely at the Postgres layer — the API
  route just widens `requireRole`'s allowed list (admin/keuangan/sales/
  tim_teknis) and lets Postgres filter the rows; no manual `employeeId`
  comparison anywhere in route code (curl-verified: a `tim_teknis` session
  linked to a specific employee saw only that employee's payslips, across
  every batch).
- **A real nested-transaction bug, caught during curl verification**:
  `markSlipDibayar`/`updateSlip`/`cancelSlip` each ran inside their own
  `withUserTransaction`, then called the *public* `getSlip` at the end to
  return the fresh state — but `getSlip` opens its own new transaction,
  which (on a separate connection) couldn't see the outer transaction's
  not-yet-committed `UPDATE`, so the returned payload showed stale
  pre-update state even though the DB itself (and the trigger) had already
  applied the change correctly. Fixed by extracting a tx-scoped
  `getSlipWithinTx(tx, ...)` helper and using it from inside every writer
  instead of the public, transaction-opening `getSlip`. Worth checking for
  the same shape (`return getX(userId, ...)` called from inside an
  already-open transaction) if any future module's writer needs to return
  freshly-mutated state.

Dropped without replacement: the mock's whole-batch "Hapus Batch" delete has
no real analog (the schema models cancellation per-payslip, not per-batch)
— replaced by a per-slip "Batalkan" action instead, which is more correct
than the mock ever was (the mock had no cancelled state at all).
`slip-builder.tsx`'s direct `fixtures/karyawan.ts` import (a live bug
bypassing the real data layer entirely for contact info) is gone —
`telepon`/`email` are now resolved server-side from the employee row at
read time, same precedent as Faktur's bank-account resolution. See
`planning/prd/05-dokumen-bisnis.md` for the reconciled Penggajian shape.

Pengiriman (the ninth module wired) had two genuine schema gaps — no
`email_accounts` (SMTP config) or send-log table existed anywhere in
`db-schema` — alongside one already-complete piece, `message_templates`
(email + WhatsApp subject/body per doc type, fully seeded since
`0000_init.sql`, just never read by the app). It's also this repo's first
background-job build: no pg-boss/nodemailer/worker code existed before this
pass, even though this doc already described the intended shape.

- **`email_accounts`** (new singleton, `migrations/0010`) — SMTP
  host/port/username/`passwordEncrypted` (AES-256-GCM via `src/lib/crypto.ts`,
  a new `ENCRYPTION_KEY` env var)/fromNama/fromEmail/`isConfigured`. RLS is
  admin-only *read* (not the broader `read_auth` every other settings
  singleton gets) since this one holds a secret. The password is never
  returned to the client, decrypted or otherwise — `toEmailAkun()`'s DTO type
  has no password field at all, and the Konfigurasi edit form always starts
  blank rather than prefilling the old plaintext value the mock used to.
- **`document_deliveries`** (new table, own file `deliveries.ts`) — a send-log
  row per SPH/Invoice/Slip actually sent. Follows `attachments`' "explicit
  nullable owner FKs, not a polymorphic type+id pair" convention
  (`quotationId`/`installmentInvoiceId`/`payslipId`), but goes one step
  further: it's the **first table in this repo with a real enforced
  Postgres `CHECK`** (`num_nonnulls(...) = 1`) — the equivalent claim on
  `attachments`' own header comment turned out to be aspirational prose, not
  an actual constraint, discovered while planning this migration.
- **The full async pipeline was built, not deferred** (the user's explicit
  choice over a synchronous-send or persistence-only cut): clicking Kirim→
  Email inserts a `queued` row, then enqueues a pg-boss job
  (`pengiriman.email`) immediately after the transaction commits — an
  "outbox-lite" simplification versus a literal same-transaction enqueue,
  which pg-boss doesn't cleanly support. `scripts/worker.ts` (a new
  long-running process, `npm run worker`) consumes the queue, decrypts the
  SMTP password, re-reads `message_templates` fresh at send time (a template
  fixed after a job is queued should still apply — the alternative,
  snapshotting at enqueue time, would silently miss already-queued jobs),
  resolves that document's tokens (`{no_sph}`/`{nama_perusahaan}`/`{pic}`/
  `{no_inv}`/`{jatuh_tempo}`/`{nama_karyawan}`/`{periode}` — richer than the
  mock's flat `{perusahaan}`/`{nomor}` pair) via nodemailer, and flips
  `status` to `sent`/`failed` with the real error message on completion.
  WhatsApp is unchanged — still an immediate client-side `window.open` +
  synchronous log write, no queue involved (`fn_payslip_after_change`-style
  "why would this need a job" reasoning: WhatsApp's own send already
  happened by the time the app ever sees it).
- **A real infra gap found standing the worker up** (same shape as Auth's
  original `app`-role grants gap): the `app` LOGIN role inherits
  `service_role`'s table grants, but not database-level `CREATE` — pg-boss's
  `boss.start()` provisions its own `pgboss` schema using the app's own
  connection (there's no separate physical login for `service_role`, only
  `SET LOCAL ROLE` within a session), and failed with "permission denied for
  database" until `infra/postgres/init/00-roles.sh` was extended with
  `GRANT CREATE ON DATABASE ... TO app`.
- **A real bug found forcing the failure path** (curl-verified by pointing
  the dev SMTP account at a closed port): the worker's catch-block fallback
  `UPDATE document_deliveries SET status = 'failed', ...` initially ran on a
  bare connection *after* the failed transaction had already rolled back its
  own `SET LOCAL ROLE service_role` — so the un-elevated `app`-role statement
  was silently filtered by RLS (no staff UPDATE policy exists on
  `document_deliveries` by design) and the row stayed `queued` forever with
  no error surfaced anywhere. Fixed by re-wrapping the failure-path update in
  its own `service_role`-elevated `sql.begin(...)`. Worth checking for this
  same shape (a fallback/error-path DB write outside the block that actually
  elevated the role) in any future worker/background-job code in this repo.
- **WhatsApp templates became editable**, matching what `message_templates`
  already stored (3 seeded `whatsapp` rows nothing read before this pass) —
  Konfigurasi's Pengiriman tab gained a WhatsApp sub-section alongside each
  document type's existing email template, both independently editable.
- **Kept, not replaced**: the SMTP-style "bring your own mail server" config
  model (host/port/username/password) the mock already had a full working UI
  for, sending via **nodemailer** rather than switching to Resend's
  single-API-key model — a deliberate divergence from this doc's original
  Resend plan (see §3/§7 above), decided when this module confirmed the two
  models don't actually fit the same UI.

Local dev exercises the whole pipeline for real via a new `maildev` service
in `infra/docker-compose.yml` (`docker compose up -d postgres minio maildev`)
— an unauthenticated SMTP catcher at `localhost:1025`, web UI at
`localhost:1080` — rather than needing real-world SMTP credentials just to
verify the queue → worker → send → status-flip chain end to end.

## 10. Open / deferred

- **Realtime:** deferred. TanStack Query refetch-on-focus + polling covers
  freshness; add a push mechanism only when a specific feature needs it.
- **Fastify:** deferred. Start with Next.js Route Handlers; extract a Fastify
  API service if/when server logic earns its own deployable.
- **Storybook:** deferred until the component library stabilizes.
