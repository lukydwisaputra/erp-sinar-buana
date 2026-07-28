# Faktur Termin Edit UI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admin/keuangan edit an Invoice Termin's tanggal, jatuh tempo, rekening bank, and catatan after it's created (not just at generate time), and let them pick a real paid date instead of always defaulting to today when marking a termin Lunas.

**Architecture:** Extend the existing `updateTerminSchema` / `updateTermin` service (already wired to `PATCH /api/faktur/[id]/termin/[terminId]`) to accept a `tanggal` field it's currently missing, then add two new dialogs to `faktur-induk-detail.tsx` — `EditTerminDialog` (tanggal/jatuhTempo/bankAccountId/catatan, non-final termins only) and `MarkLunasDialog` (paid-date picker, replaces the current one-click "Tandai Lunas"). Both dialogs reuse the existing `useUpdateTermin` mutation and the `DateField`/`Field`/`Select` components already used by `GenerateTerminDialog`.

**Tech Stack:** Next.js (App Router), React, TanStack Query, Zod, Drizzle ORM, Vitest.

## Global Constraints

- Edit affordances (both dialogs) are visible only to `isFinance(session)` (admin/keuangan) — mirrors the server-side `requireRole(session, "admin", "keuangan")` already enforced in the PATCH route (`src/app/api/faktur/[id]/termin/[terminId]/route.ts`). No server-side change needed for this boundary.
- A termin is **locked once final** (`statusSystemRole === "LUNAS" || "BATAL"`) — `EditTerminDialog` must never open for a final termin. This matches the existing `isFinal` guard already used in `TerminRow`.
- `paidDate` is only ever set through `MarkLunasDialog`, at the moment a termin transitions to Lunas — never editable after the fact. This is deliberate: `fn_installment_validate` (`db-schema/sql/triggers/20_billing_automation.sql:56-65`) buckets cashflow/tax entries off `coalesce(new.paid_date, new.date)`, so changing it post-finalization would desync already-generated cashflow/tax entries.
- Editing `tanggal` on a non-final termin is safe — termin numbering (`{indukNumber}-T{index}`) is derived app-side from the parent Induk, not keyed off the termin's own `date` column (`db-schema/sql/triggers/10_numbering.sql`).
- This repo has no service-level or component-level test harness for the faktur module — only pure mapping functions get Vitest unit tests (`src/lib/__tests__/faktur-mapping.test.ts`). Follow that convention: the Zod schema change gets a unit test; the Drizzle service change and the React components are verified via `npx tsc --noEmit` plus manual QA (Task 4), not new test files.

---

### Task 1: Backend — `tanggal` support on Invoice Termin update

**Files:**
- Modify: `src/lib/schemas/faktur.ts:124-131` (`updateTerminSchema`)
- Modify: `src/lib/faktur/service.ts:465-488` (`updateTermin`)
- Test: `src/lib/__tests__/faktur-schema.test.ts` (new)

**Interfaces:**
- Produces: `UpdateTerminInput` (from `src/lib/schemas/faktur.ts`) gains an optional `tanggal: string` field. Every later task that builds `UpdateTerminInput` (Tasks 2 and 3) may now pass `tanggal`.

- [ ] **Step 1: Write the failing test for the schema**

Create `src/lib/__tests__/faktur-schema.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { updateTerminSchema } from "@/lib/schemas/faktur";

describe("updateTerminSchema", () => {
  it("accepts and preserves a tanggal field", () => {
    const parsed = updateTerminSchema.parse({
      tanggal: "2026-07-01",
      jatuhTempo: "2026-07-15",
      bankAccountId: "bank-1",
      catatan: "koreksi tanggal",
    });
    expect(parsed.tanggal).toBe("2026-07-01");
  });

  it("still accepts a payload with tanggal omitted", () => {
    const parsed = updateTerminSchema.parse({ statusId: "status-1" });
    expect(parsed.tanggal).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/__tests__/faktur-schema.test.ts`
Expected: FAIL — first assertion, `parsed.tanggal` is `undefined` because `z.object` strips the unrecognized `tanggal` key.

- [ ] **Step 3: Add `tanggal` to the schema**

In `src/lib/schemas/faktur.ts`, change:

```typescript
export const updateTerminSchema = z.object({
  statusId: z.string().optional(),
  paidDate: z.string().nullable().optional(),
  jatuhTempo: z.string().nullable().optional(),
  bankAccountId: z.string().nullable().optional(),
  catatan: z.string().optional(),
});
```

to:

```typescript
export const updateTerminSchema = z.object({
  statusId: z.string().optional(),
  paidDate: z.string().nullable().optional(),
  tanggal: z.string().optional(),
  jatuhTempo: z.string().nullable().optional(),
  bankAccountId: z.string().nullable().optional(),
  catatan: z.string().optional(),
});
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/__tests__/faktur-schema.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Persist `tanggal` in the service**

In `src/lib/faktur/service.ts`, inside `updateTermin`'s `.set({...})` (currently):

```typescript
    await tx
      .update(schema.installmentInvoices)
      .set({
        ...(input.statusId !== undefined && { statusId: input.statusId }),
        ...(input.paidDate !== undefined && { paidDate: input.paidDate }),
        ...(input.jatuhTempo !== undefined && { dueDate: input.jatuhTempo }),
        ...(input.bankAccountId !== undefined && { bankAccountId: input.bankAccountId }),
        ...(input.catatan !== undefined && { notes: input.catatan || null }),
        updatedBy: userId,
      })
      .where(eq(schema.installmentInvoices.id, terminId));
```

add a `date` line matching the same conditional-spread pattern:

```typescript
    await tx
      .update(schema.installmentInvoices)
      .set({
        ...(input.statusId !== undefined && { statusId: input.statusId }),
        ...(input.paidDate !== undefined && { paidDate: input.paidDate }),
        ...(input.tanggal !== undefined && { date: input.tanggal }),
        ...(input.jatuhTempo !== undefined && { dueDate: input.jatuhTempo }),
        ...(input.bankAccountId !== undefined && { bankAccountId: input.bankAccountId }),
        ...(input.catatan !== undefined && { notes: input.catatan || null }),
        updatedBy: userId,
      })
      .where(eq(schema.installmentInvoices.id, terminId));
```

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors from `src/lib/faktur/service.ts` or `src/lib/schemas/faktur.ts`.

- [ ] **Step 7: Commit**

```bash
git add src/lib/schemas/faktur.ts src/lib/faktur/service.ts src/lib/__tests__/faktur-schema.test.ts
git commit -m "feat: allow editing an Invoice Termin's tanggal after creation"
```

---

### Task 2: `MarkLunasDialog` — paid-date picker for "Tandai Lunas"

**Files:**
- Modify: `src/components/faktur/faktur-induk-detail.tsx`

**Interfaces:**
- Consumes: `useUpdateTermin()` from `@/lib/query/faktur` (already imported at line 32) — `mutateAsync({ masterInvoiceId, terminId, input: UpdateTerminInput })`. `DateField` component (defined at line 55 in this same file). `todayISO()` helper (line 52). `FakturInduk`, `InvoiceTermin` types from `@/lib/schemas/faktur` (already imported at line 40).
- Produces: `MarkLunasDialog` component, used by Task 3's `TerminRow` wiring.

- [ ] **Step 1: Add the `MarkLunasDialog` component**

In `src/components/faktur/faktur-induk-detail.tsx`, insert a new section right after `GenerateTerminDialog` closes (after the `}` that ends the function at line 148, before the `// ─── Termin document dialog ───` comment at line 150):

```typescript
// ─── Mark Lunas dialog ────────────────────────────────────────────────────────

function MarkLunasDialog({ induk, termin, lunasStatusId, open, onOpenChange }: {
  induk: FakturInduk; termin: InvoiceTermin; lunasStatusId: string; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const updateTermin = useUpdateTermin();
  const [paidDate, setPaidDate] = React.useState(todayISO());

  React.useEffect(() => {
    if (open) setPaidDate(todayISO());
  }, [open]);

  const onSubmit = async () => {
    await updateTermin.mutateAsync({
      masterInvoiceId: induk.id,
      terminId: termin.id,
      input: { statusId: lunasStatusId, paidDate },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tandai {termin.label} Lunas</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <DateField label="Tanggal Lunas" value={paidDate} onChange={setPaidDate} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button loading={updateTermin.isPending} onClick={onSubmit}>Tandai Lunas</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 2: Wire it into `TerminRow`**

In `TerminRow` (starts at line 220), add a `lunasOpen` state next to the existing `cancelOpen` state. Current:

```typescript
  const updateTermin = useUpdateTermin();
  const [docOpen, setDocOpen] = React.useState(false);
  const [refDocOpen, setRefDocOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
```

becomes:

```typescript
  const updateTermin = useUpdateTermin();
  const [docOpen, setDocOpen] = React.useState(false);
  const [refDocOpen, setRefDocOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const [lunasOpen, setLunasOpen] = React.useState(false);
```

Replace the "Tandai Lunas" `DropdownMenuItem` (currently mutates directly):

```typescript
                {lunasStatusId && (
                  <DropdownMenuItem onSelect={() => updateTermin.mutate({ masterInvoiceId: induk.id, terminId: termin.id, input: { statusId: lunasStatusId, paidDate: todayISO() } })}>
                    <CheckCircle2 className="size-3.5" /> Tandai Lunas
                  </DropdownMenuItem>
                )}
```

with one that just opens the dialog:

```typescript
                {lunasStatusId && (
                  <DropdownMenuItem onSelect={() => setLunasOpen(true)}>
                    <CheckCircle2 className="size-3.5" /> Tandai Lunas
                  </DropdownMenuItem>
                )}
```

Then render the dialog. Right after the existing cancel `<AlertDialog>` block closes (just before the final `</div>` and closing `}` of `TerminRow`, i.e. right after line 304's `</AlertDialog>`), add:

```typescript
      {lunasStatusId && (
        <MarkLunasDialog induk={induk} termin={termin} lunasStatusId={lunasStatusId} open={lunasOpen} onOpenChange={setLunasOpen} />
      )}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/faktur/faktur-induk-detail.tsx
git commit -m "feat: let admin/keuangan pick a paid date when marking a termin Lunas"
```

---

### Task 3: `EditTerminDialog` — edit tanggal/jatuh tempo/bank/catatan

**Files:**
- Modify: `src/components/faktur/faktur-induk-detail.tsx`

**Interfaces:**
- Consumes: `useUpdateTermin()`, `useOptionList("rekening_bank")` from `@/lib/query/daftar-pilihan` (already imported at line 34, same call shape as `GenerateTerminDialog` at line 91 — returns `{ data: bankOptions = [] }` where each option has `{ id: string; nama: string; extra: { bank?: { nomor: string } } }`). `isFinance` from `@/lib/auth/rbac` (not yet imported — add it). `Pencil` icon from `lucide-react` (not yet imported — add it).
- Produces: `EditTerminDialog` component and an `isFinanceUser` boolean used within `TerminRow`.

- [ ] **Step 1: Add the `isFinance` and `Pencil` imports**

In `src/components/faktur/faktur-induk-detail.tsx`, change:

```typescript
import { CalendarIcon, Download, Send, Plus, Ban, CheckCircle2, X } from "lucide-react";
```

to:

```typescript
import { CalendarIcon, Download, Send, Plus, Ban, CheckCircle2, Pencil, X } from "lucide-react";
```

and change:

```typescript
import { isClientPortal, isAdminUser } from "@/lib/auth/rbac";
```

to:

```typescript
import { isClientPortal, isAdminUser, isFinance } from "@/lib/auth/rbac";
```

- [ ] **Step 2: Add the `EditTerminDialog` component**

Insert this new section right after `MarkLunasDialog` (added in Task 2) closes, before the `// ─── Termin document dialog ───` comment:

```typescript
// ─── Edit termin dialog ───────────────────────────────────────────────────────

function EditTerminDialog({ induk, termin, open, onOpenChange }: {
  induk: FakturInduk; termin: InvoiceTermin; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const updateTermin = useUpdateTermin();
  const { data: bankOptions = [] } = useOptionList("rekening_bank");
  const [tanggal, setTanggal] = React.useState(termin.tanggal);
  const [jatuhTempo, setJatuhTempo] = React.useState(termin.jatuhTempo ?? "");
  const [bankAccountId, setBankAccountId] = React.useState(termin.bankAccountId ?? "");
  const [catatan, setCatatan] = React.useState(termin.catatan);

  React.useEffect(() => {
    if (open) {
      setTanggal(termin.tanggal);
      setJatuhTempo(termin.jatuhTempo ?? "");
      setBankAccountId(termin.bankAccountId ?? "");
      setCatatan(termin.catatan);
    }
  }, [open, termin]);

  const onSubmit = async () => {
    await updateTermin.mutateAsync({
      masterInvoiceId: induk.id,
      terminId: termin.id,
      input: { tanggal, jatuhTempo: jatuhTempo || null, bankAccountId: bankAccountId || null, catatan },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {termin.label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <DateField label="Tanggal" value={tanggal} onChange={setTanggal} />
            <DateField label="Jatuh Tempo" value={jatuhTempo} onChange={setJatuhTempo} />
          </div>
          <Field>
            <FieldLabel>Rekening Bank</FieldLabel>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Pilih rekening…" /></SelectTrigger>
              <SelectContent>
                {bankOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.nama}{b.extra.bank ? ` — ${b.extra.bank.nomor}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Catatan</FieldLabel>
            <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan (opsional)" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button loading={updateTermin.isPending} onClick={onSubmit}>Simpan</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 3: Wire it into `TerminRow`**

Add an `editOpen` state next to `lunasOpen` (from Task 2) and an `isFinanceUser` boolean next to the existing `isClient`. Current:

```typescript
  const { data: session } = useSession();
  const isClient = isClientPortal(session);
  const referencedTermin = termin.referencedInstallment
```

becomes:

```typescript
  const { data: session } = useSession();
  const isClient = isClientPortal(session);
  const isFinanceUser = isFinance(session);
  const referencedTermin = termin.referencedInstallment
```

and add `const [editOpen, setEditOpen] = React.useState(false);` next to `const [lunasOpen, setLunasOpen] = React.useState(false);`.

Update the dropdown's outer visibility gate — currently:

```typescript
          {!isClient && !isFinal && (lunasStatusId || batalStatusId) && (
```

becomes:

```typescript
          {!isClient && !isFinal && (lunasStatusId || batalStatusId || isFinanceUser) && (
```

Add the "Edit" item as the first entry inside `<DropdownMenuContent align="end">`, before the existing "Tandai Lunas" item:

```typescript
              <DropdownMenuContent align="end">
                {isFinanceUser && (
                  <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                    <Pencil className="size-3.5" /> Edit
                  </DropdownMenuItem>
                )}
                {lunasStatusId && (
```

Finally, replace the `MarkLunasDialog` render block added in Task 2 — currently:

```typescript
      {lunasStatusId && (
        <MarkLunasDialog induk={induk} termin={termin} lunasStatusId={lunasStatusId} open={lunasOpen} onOpenChange={setLunasOpen} />
      )}
```

with (adds the `EditTerminDialog` render, keeps the existing `MarkLunasDialog` render as-is):

```typescript
      <EditTerminDialog induk={induk} termin={termin} open={editOpen} onOpenChange={setEditOpen} />
      {lunasStatusId && (
        <MarkLunasDialog induk={induk} termin={termin} lunasStatusId={lunasStatusId} open={lunasOpen} onOpenChange={setLunasOpen} />
      )}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/faktur/faktur-induk-detail.tsx
git commit -m "feat: let admin/keuangan edit a non-final Invoice Termin's tanggal/jatuh tempo/bank/catatan"
```

---

### Task 4: Manual QA pass

**Files:** none (verification only)

**Interfaces:**
- Consumes: the running app (dev server) and a logged-in admin or keuangan session.

- [ ] **Step 1: Start the dev server**

Run (background):

```bash
npm run dev > /tmp/erp-dev-qa.log 2>&1 &
```

Wait for readiness:

```bash
for i in $(seq 1 40); do curl -sf -o /dev/null http://localhost:3000/ && break; sleep 1; done
```

If it fails to come up, check `/tmp/erp-dev-qa.log` — a `ECONNREFUSED` on the Postgres port means the local Postgres/minio/maildev containers aren't running (`docker compose up -d postgres minio maildev` from `infra/`).

- [ ] **Step 2: Log in and open a Faktur Induk with at least one non-final termin**

As an admin or keuangan user, navigate to `/faktur`, open a Faktur Induk that has at least one termin still "Belum Lunas". Confirm the row's "Aksi" dropdown now shows "Edit" above "Tandai Lunas".

- [ ] **Step 3: Verify Edit persists all four fields**

Click "Edit", change Tanggal, Jatuh Tempo, Rekening Bank, and Catatan to new values, click "Simpan". Confirm the dialog closes, the row updates, and reopening "Edit" shows the new values (proves the PATCH round-trip through Task 1's schema/service change and Task 3's dialog).

- [ ] **Step 4: Verify Edit is hidden for non-finance / client-portal sessions**

Log in as a non-admin/non-keuangan role (or client-portal `viewer`). Confirm the "Edit" item is absent (client-portal shouldn't see the Aksi dropdown at all; other non-finance roles should see the dropdown without "Edit", if they have Tandai Lunas/Batalkan access).

- [ ] **Step 5: Verify Mark Lunas with a custom paid date**

On a different non-final termin, click "Tandai Lunas". Confirm a dialog opens with "Tanggal Lunas" defaulted to today. Change it to a date in a different month, confirm. Check the Arus Kas (`/arus-kas`) or Pajak (`/pajak`) view for that project — the generated cashflow/tax entries should fall in the period matching the chosen paid date, not today's.

- [ ] **Step 6: Verify Edit is unavailable once final**

On the termin just marked Lunas, confirm the "Aksi" dropdown either doesn't appear or no longer offers "Edit" (matches the existing `isFinal` lock).

- [ ] **Step 7: Stop the dev server**

```bash
lsof -ti:3000 -sTCP:LISTEN | xargs -r kill
```
