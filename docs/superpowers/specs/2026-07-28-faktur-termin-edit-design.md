# Faktur Termin — Edit UI Design Spec

> **Branch:** `testing`
> **Date:** 2026-07-28

---

## 1. Goal

Invoice Termin (`installment_invoices`) fields — tanggal, jatuh tempo, rekening bank, catatan — are currently only settable once, at generate time (`GenerateTerminDialog`). There's no way to correct them afterward short of a direct DB edit. Add an edit path for non-final termins, and fix the paid-date flow so marking Lunas doesn't hardcode "today."

Out of scope: a CRUD-completeness audit across other modules (Penawaran, Proyek, Karyawan, dll.) — that's a separate follow-up deliverable (a recommendations report, not an implementation) requested alongside this feature.

---

## 2. Current State

- `updateTerminSchema` (`src/lib/schemas/faktur.ts:124-131`) accepts `statusId`, `paidDate`, `jatuhTempo`, `bankAccountId`, `catatan` — **not `tanggal`**.
- `updateTermin` service (`src/lib/faktur/service.ts:465-488`) only persists the fields the schema allows — same gap.
- `PATCH /api/faktur/[id]/termin/[terminId]` already gates on `requireRole(session, "admin", "keuangan")` — no server change needed there.
- UI (`TerminRow` in `faktur-induk-detail.tsx:220-264`) only exposes two actions: "Tandai Lunas" (`updateTermin.mutate({ input: { statusId: lunasStatusId, paidDate: todayISO() } })`, no date choice) and "Batalkan". No edit affordance for tanggal/jatuhTempo/bankAccountId/catatan.
- Termin numbering (`{indukNumber}-T{index}`, `db-schema/sql/triggers/10_numbering.sql`) is derived app-side from the parent Induk, not keyed off the termin's own `date` column — so editing `tanggal` after creation is safe, it won't corrupt numbering.
- `fn_installment_validate` (`db-schema/sql/triggers/20_billing_automation.sql:56-65`) buckets cashflow/tax entries by `coalesce(new.paid_date, new.date)` — this only matters once a termin is finalized (Lunas), which is exactly why finalized termins must stay locked.

---

## 3. Design

### 3.1 Edit Termin dialog

New `EditTerminDialog` component, same visual pattern as the existing `GenerateTerminDialog`. Opened from a new "Edit" item in `TerminRow`'s Aksi dropdown.

- **Fields:** Tanggal, Jatuh Tempo (both `DateField`), Rekening Bank (`Select`, same options source as generate dialog), Catatan (textarea).
- **Prefill:** current termin values.
- **Visibility:** rendered only when `isFinance(session) && !isFinal` (mirrors the existing `!isClient && !isFinal` guard already on the Aksi menu, tightened from "not client" to "finance role" since edit is a finance action). `isFinance` already exists in `src/lib/auth/rbac.ts:47`.
- **Submit:** `useUpdateTermin().mutate({ masterInvoiceId: induk.id, terminId: termin.id, input: { tanggal, jatuhTempo, bankAccountId, catatan } })`.

### 3.2 Mark Lunas gets a paid-date picker

Replace the current one-click `DropdownMenuItem onSelect={...}` for "Tandai Lunas" with a small `MarkLunasDialog`: single `DateField` for Tanggal Lunas, defaulting to `todayISO()`, editable before confirming. On submit: `updateTermin.mutate({ input: { statusId: lunasStatusId, paidDate } })` — same call as today, just with a user-chosen date instead of a hardcoded one.

This is the only place `paidDate` becomes user-settable. Once a termin is Lunas/Batal, it's final and the Edit Termin dialog (3.1) won't open for it — consistent with the billing-automation trigger having already bucketed cashflow/tax entries off that paid date.

### 3.3 Backend: add `tanggal` support

- `updateTerminSchema`: add `tanggal: z.string().optional()`.
- `service.ts`'s `updateTermin`: add `...(input.tanggal !== undefined && { date: input.tanggal })` to the `.set({...})` call, same conditional-spread pattern as the existing fields.

No other schema/route changes — `requireRole` already covers the finance-only boundary server-side.

---

## 4. Components Affected

- `src/lib/schemas/faktur.ts` — `updateTerminSchema` gains `tanggal`.
- `src/lib/faktur/service.ts` — `updateTermin` persists `date`.
- `src/components/faktur/faktur-induk-detail.tsx` — new `EditTerminDialog`, new `MarkLunasDialog` (replaces the inline mutate call), both wired into `TerminRow`'s Aksi dropdown.

---

## 5. Error Handling

Reuses the existing mutation's error path — `useUpdateTermin`'s `onError` already toasts `apiErrorMessage(error, "Gagal memperbarui Invoice Termin.")`. No new error handling needed.

---

## 6. Testing

The faktur module has no existing service/schema-level test suite (only mapping unit tests in `src/lib/__tests__/faktur-mapping.test.ts`), so this follows the established pattern of manual QA over automated backend tests for this layer. Verification plan (via the `run` skill, dev server):

1. Generate a termin, then open Edit — confirm tanggal/jatuh tempo/bank/catatan all prefill and persist on save.
2. Confirm the Edit action is absent for a client-portal session and for a non-finance role.
3. Mark a termin Lunas with a custom paid date (not today) — confirm the cashflow/tax entries land in the period matching the chosen date, not today's.
4. Confirm Edit is unavailable once a termin is Lunas or Batal.
