# Sinar Buana ERP — Database Schema

Database schema for the **PT Sinar Buana Mandiri Jaya (SBMJ)** ERP — an
environmental-permit consultancy. Authored with **Drizzle ORM (TypeScript)** for
a **self-hosted Supabase Postgres** instance, single-tenant.

Source of truth: [`planning/prd`](../planning/prd). This schema implements the
data model in PRD Bab 12 and every functional module (Bab 2–10).

📊 **Visual diagrams:** see [ERD.md](ERD.md) — business-flow + per-domain
entity-relationship diagrams.

## Stack & conventions

| Concern | Decision |
| --- | --- |
| Engine | PostgreSQL (self-hosted Supabase) |
| Schema authoring | Drizzle ORM (`src/schema/`) → generates SQL migrations |
| Auth | Supabase Auth (`auth.users`); `user_profiles` is a 1:1 extension |
| Tenancy | Single-tenant |
| Primary keys | `uuid` (`gen_random_uuid()`) |
| Money | `numeric(18,2)` (IDR carries `.00`) |
| Rates / multipliers | `numeric(9,4)` |
| Timestamps | `created_at` / `updated_at` (trigger-maintained) |
| Soft delete | `deleted_at` + `deleted_by`; partial-unique indexes on live rows |
| Audit | `created_by` / `updated_by` + generic `audit_log` (triggers) |
| Security | RLS on every table, mirroring the RBAC matrix (Bab 2.2) |
| Automation | Postgres triggers/functions (Bab 7.3, 10.4/10.5) |

## Layout

```
db-schema/
├── src/schema/            # Drizzle table definitions (one file per module)
│   ├── _shared.ts         #   reusable column helpers (pk, money, timestamps…)
│   ├── enums.ts           #   Postgres enums (only genuinely fixed sets)
│   ├── auth.ts            #   user_profiles + auth.users reference
│   ├── config.ts          #   managed master data / lookups (Bab 9)
│   ├── settings.ts        #   company profile, tax settings, numbering
│   ├── master-data.ts     #   companies, contacts, service catalog, employees
│   ├── quotations.ts      #   SPH + items + term scheme + RAB
│   ├── schedules.ts       #   activity schedule (shared SPH ↔ project Gantt)
│   ├── projects.ts        #   projects, milestones, assignees, comments, log
│   ├── billing.ts         #   master invoices → installment invoices
│   ├── payroll.ts         #   payslips + components
│   ├── cashflow.ts        #   cashflow entries
│   ├── tax.ts             #   Tax Center entries
│   ├── audit.ts           #   audit_log
│   ├── notifications.ts   #   notifications
│   ├── attachments.ts     #   file attachments
│   ├── relations.ts       #   Drizzle relational query relations
│   └── index.ts           #   barrel (drizzle.config.ts points here)
├── migrations/            # drizzle-kit generated SQL (0000_init.sql)
└── sql/                   # hand-written SQL applied AFTER the migration
    ├── indexes.sql        #   FK/filter indexes + partial-unique constraints
    ├── triggers/          #   updated_at, numbering, automation, audit
    ├── rls/               #   helper functions + policies
    └── seed/              #   default config (statuses, categories, 12-step…)
```

## Applying the schema

> Use the **migrate** workflow (not `drizzle-kit push`) so the hand-written SQL
> under `sql/` is never diffed away. `drizzle-kit generate` diffs the Drizzle
> schema against its own snapshot, so the `sql/` objects are left untouched.

Order matters — apply in exactly this sequence:

```bash
# 0. Supabase already provides the `auth` schema, auth.users and auth.uid().
#    (For a NON-Supabase Postgres, create stubs first — see below.)

# 1. Tables, FKs, enums (Drizzle-generated)
psql "$DATABASE_URL" -f migrations/0000_init.sql

# 1b. Link user_profiles.id -> auth.users(id) (Supabase-managed auth schema)
psql "$DATABASE_URL" -f sql/00_auth_link.sql

# 2. Indexes + partial-unique constraints
psql "$DATABASE_URL" -f sql/indexes.sql

# 3. Triggers / functions (order-sensitive: helpers first)
psql "$DATABASE_URL" -f sql/triggers/00_helpers_updated_at.sql
psql "$DATABASE_URL" -f sql/triggers/10_numbering.sql
psql "$DATABASE_URL" -f sql/triggers/20_billing_automation.sql
psql "$DATABASE_URL" -f sql/triggers/30_payroll_automation.sql
psql "$DATABASE_URL" -f sql/triggers/40_tax_automation.sql
psql "$DATABASE_URL" -f sql/triggers/50_audit.sql

# 4. RLS (helpers before policies)
psql "$DATABASE_URL" -f sql/rls/00_helpers.sql
psql "$DATABASE_URL" -f sql/rls/10_policies.sql

# 5. Seed defaults
psql "$DATABASE_URL" -f sql/seed/00_seed.sql
```

Regenerate the migration after editing `src/schema/*`:

```bash
npm install
npm run generate     # drizzle-kit generate
```

### Non-Supabase Postgres

The schema references `auth.users` and `auth.uid()`. On vanilla Postgres create
stubs before step 1:

```sql
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key, email text);
create or replace function auth.uid() returns uuid
  language sql stable as $$ select nullif(current_setting('app.user_id', true),'')::uuid $$;

-- RLS policies grant to the Supabase role `authenticated`; create the roles too:
do $$ begin
  if not exists (select 1 from pg_roles where rolname='authenticated') then
    create role authenticated; end if;
  if not exists (select 1 from pg_roles where rolname='anon') then
    create role anon; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then
    create role service_role bypassrls; end if;
end $$;
```

## Key design decisions

- **Configurable, not hard-coded** (Bab 9). Statuses, categories, document types,
  positions, tax rates, numbering formats and templates are *data* in lookup
  tables — the client edits them. Only genuinely fixed sets are Postgres enums.
- **Workflow statuses map to stable system roles** (`SELESAI/LUNAS/DIBAYAR/BATAL`).
  Automation keys off the role, so renaming a label never breaks it (Bab 9.2).
- **Billing automation** (Bab 5.1/10.4). When an installment invoice reaches a
  `LUNAS`-role status, a trigger creates 3 locked cashflow entries (service
  income, output VAT, withheld PPh23) and the matching Tax Center entries; the
  master invoice flips to `LUNAS` once paid value covers Total Biaya. PPN is
  skipped when the company is non-PKP.
- **Payroll automation** (Bab 5.2/10.5). `DIBAYAR` payslip → one locked cashflow
  debit = net (take-home) pay; PPh21 (if > 0) and BPJS become Tax Center
  liabilities. Bonus is part of take-home (not double-booked).
- **Tax settlement** (Bab 10.6). Marking a liability "Sudah Disetor" creates a
  locked cashflow expense; PPh23 (a tax credit) moves no cash.
- **Tax snapshots.** DPP/PPN/PPh23/totals are stored on each installment so
  historical invoices stay correct if rates change later.
- **Document numbering** (Bab 9.5). Per-type counters, reset monthly, assigned
  once and immutable on edit (numbering trigger).
- **Immutable automation rows.** Auto cashflow/tax entries are `is_locked` and
  follow their source's status (a `BATAL` source cancels them).

## RLS notes

Policies in `sql/rls/10_policies.sql` implement the RBAC matrix (Bab 2.2):

- **Admin** — full access (`admin_all` on every table).
- **Slip gaji confidentiality** — an employee sees only their own payslip;
  Finance/Admin see all (Bab 2.2 / 5.2).
- **Tax Center** — Admin/Finance only.
- **Cashflow** — Admin/Finance/Viewer read; Finance writes; locked rows are not
  hand-editable.
- **Pragmatic widening:** configuration/lookup tables are readable by all signed-
  in staff (the UI needs them to render forms); **writes stay Admin-only**.

System-generated rows (numbering, automation, audit, status log) are written by
`SECURITY DEFINER` functions and bypass RLS.

## Scheduled jobs

`mark_overdue_tax_entries()` flips unsettled past-due tax entries to `terlambat`
(🔴). Schedule it daily (e.g. `pg_cron`). H-3 due reminders and recurring
Laporan Semester generation are driven from the app against
`tax_entries.due_date`, `installment_invoices.due_date`, `notifications` and the
`service_catalog.is_recurring` flag.
```
