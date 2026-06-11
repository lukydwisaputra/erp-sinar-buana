# Proyek Module — Phase 3 Design Spec

**Date:** 2026-06-11
**Scope:** Must-have features only (PRD §6, FR-04.1–04.3, FR-04.5–04.7, FR-04.9)
**Out of scope (deferred):** Gantt chart (FR-04.4), collaboration/comments/mentions (FR-04.5 detail), Realisasi RAB (FR-04.10), profitability panel (FR-04.11), Laporan Semester berulang (FR-04.8)
**Source of truth:** [planning/user-stories/04-manajemen-proyek.md](../../../planning/user-stories/04-manajemen-proyek.md)

---

## 1. Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Milestone storage | Embedded in Proyek (not separate entity) | Matches existing fixture pattern (termins in faktur); less boilerplate |
| Project creation | From Penawaran row menu only (deal-status SPHs) | Keeps creation gated to real deals; avoids duplicate/orphan projects |
| Project detail layout | Tabbed full page | Milestones + info + log need space; sheet is too constrained |
| Milestone editing | Inline (blur = save) | Fast for status/date updates; consistent with task-tool conventions |
| Termin trigger UX | "Tagih X%" badge on milestone row | Contextual, non-disruptive; user acts when ready |
| Milestone reorder | ↑/↓ buttons | Simpler than drag-and-drop for prototype |

---

## 2. Data Layer

### 2.1 Schemas — `src/lib/schemas/proyek.ts`

```ts
export const proyekStatus = z.enum([
  "po_kontrak", "collecting_data", "drafting",
  "tunggu_pengesahan", "pending", "selesai", "batal",
]);

export const milestoneStatus = z.enum([
  "belum_mulai", "on_track", "terlambat", "selesai",
]);

export const milestoneSchema = z.object({
  id: z.string(),
  nama: z.string(),
  urutan: z.number(),
  assigneeNama: z.string().nullable(),
  targetDate: z.string().nullable(),   // ISO date "YYYY-MM-DD"
  actualDate: z.string().nullable(),
  status: milestoneStatus,
  pemicuTermin: z.object({
    fakturId: z.string(),
    persen: z.number(),
  }).nullable(),
});

export const proyekSchema = z.object({
  id: z.string(),
  nama: z.string(),
  perusahaanId: z.string(),
  perusahaanNama: z.string(),         // denormalized for list display
  area: z.string(),
  tahun: z.number(),
  layananNama: z.array(z.string()),   // display names from katalog
  status: proyekStatus,
  nilaiKontrak: z.number(),
  sphId: z.string().nullable(),
  assignees: z.array(z.object({
    karyawanId: z.string(),
    nama: z.string(),
  })),
  milestones: z.array(milestoneSchema),
  createdAt: z.string(),              // ISO datetime
});

export type Proyek = z.infer<typeof proyekSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;
export type ProyekStatus = z.infer<typeof proyekStatus>;
export type MilestoneStatus = z.infer<typeof milestoneStatus>;
```

### 2.2 Activity Log — `src/lib/data/proyek.ts` (in-memory)

```ts
export type ProyekLogEntry = {
  id: string;
  proyekId: string;
  timestamp: string;   // ISO datetime
  description: string; // e.g. "Status diubah: Drafting → Tunggu Pengesahan"
};
```

Appended by `updateProyekStatus` and `updateMilestone` (when status changes to `selesai`).

### 2.3 Data Functions — `src/lib/data/proyek.ts`

| Function | Signature | Notes |
|---|---|---|
| `listProyek` | `(params?: { q? }) → Proyek[]` | Filter by nama / perusahaanNama |
| `getProyek` | `(id) → Proyek \| null` | |
| `createProyek` | `(input: ProyekCreate) → Proyek` | Generates id `PRJ-XXX`, appends to store |
| `updateProyekStatus` | `(id, status) → Proyek` | Updates status + appends log entry |
| `updateMilestone` | `(proyekId, milestoneId, patch) → Proyek` | Partial update; appends log if status → selesai |
| `addMilestone` | `(proyekId, milestone) → Proyek` | Appends milestone |
| `deleteMilestone` | `(proyekId, milestoneId) → Proyek` | Removes milestone, re-indexes urutan |
| `listProyekLog` | `(proyekId) → ProyekLogEntry[]` | Returns log entries for a project |

### 2.4 Query Hooks — `src/lib/query/proyek.ts`

| Hook | Mutation / Query |
|---|---|
| `useProyekList(params?)` | query `["proyek", params]` |
| `useProyek(id)` | query `["proyek", id]` |
| `useCreateProyek()` | mutation; invalidates `["proyek"]` |
| `useUpdateProyekStatus()` | mutation; invalidates `["proyek", id]` + `["proyek"]`; onError toast |
| `useUpdateMilestone()` | mutation; invalidates `["proyek", id]`; onError toast |
| `useAddMilestone()` | mutation; invalidates `["proyek", id]`; onError toast |
| `useDeleteMilestone()` | mutation; invalidates `["proyek", id]`; onError toast |
| `useProyekLog(id)` | query `["proyek-log", id]` |

All mutations follow the established pattern: `onError: () => toast.error("Gagal ... Coba lagi.")`.

### 2.5 Fixtures — `src/lib/fixtures/proyek.ts`

4 projects seeded across statuses, each linked to an existing SPH fixture:

| ID | Nama | Status | SPH | Milestones |
|---|---|---|---|---|
| PRJ-001 | Pertek Air Limbah — PT Maju Jaya | `drafting` | SPH/001 | 5 milestones, 1 with pemicuTermin |
| PRJ-002 | Dokumen AMDAL — PT Karya Bersama | `collecting_data` | SPH/002 | 6 milestones |
| PRJ-003 | UKL-UPL — PT Sumber Energi | `tunggu_pengesahan` | SPH/003 | 4 milestones, 1 selesai with pemicuTermin |
| PRJ-004 | Laporan RKL-RPL — PT Delta Prima | `selesai` | SPH/004 | 4 milestones, all selesai |

---

## 3. Pages & Navigation

### 3.1 File Structure

```
src/
  lib/
    schemas/proyek.ts             NEW
    fixtures/proyek.ts            NEW
    data/proyek.ts                NEW
    query/proyek.ts               NEW
    __tests__/proyek-data.test.ts NEW
  app/(app)/
    proyek/
      page.tsx                    REPLACE placeholder → list
      baru/page.tsx               NEW — create form (pre-filled from SPH)
      [id]/page.tsx               NEW — detail page (tabbed)
  components/
    penawaran/sph-form.tsx        — (no change; creation is in page.tsx row menu)
  app/(app)/penawaran/page.tsx    MODIFY — add "Buat Proyek" / "Lihat Proyek" to row menu
```

### 3.2 List Page — `/proyek`

- `DataTable` with columns: ID (mono, link to detail), Nama Proyek (link), Perusahaan, Layanan (up to 2 `Badge variant="info"` + `+N` overflow), Status (`ProyekStatusBadge`), Nilai Kontrak (right-aligned mono, compact), Tahun
- Search by nama or perusahaanNama
- No "Buat Proyek" button — creation entry point is Penawaran
- Row click navigates to `/proyek/[id]`

### 3.3 Create Page — `/proyek/baru?sphId=XXX`

- Reads `sphId` from query params; fetches SPH data to pre-fill fields
- Reads SPH data via `listPenawaran()` filtered by id (no single-record getter exists; add `getSph(id)` to `src/lib/data/penawaran.ts`)
- Pre-filled (read-only): Perusahaan, Layanan, Nilai Kontrak
- User fills: Nama Proyek (editable, defaults to "Proyek — [Perusahaan]"), Area, Tahun (defaults to current year), Assignees (multi-select from karyawan fixtures)
- On submit → `createProyek` mutation → navigate to `/proyek/[id]`
- Uses `FormSheet`-style layout within a full page (consistent with SPH builder create flow)

### 3.4 Detail Page — `/proyek/[id]`

**Header:**
- Nama Proyek (large), `ProyekStatusBadge`
- Perusahaan name, Nilai Kontrak (compact + full on hover)
- Assignee avatars (initials, same `Avatar` component as Karyawan)
- Status change dropdown (advances through workflow; confirm dialog for destructive transitions like `batal`)

**Tabs:**

#### Tab 1 — Milestone

Top bar:
- "Muat Template" button (visible when ≥1 linked layanan has `templateMilestone` in katalog fixtures; if multiple layanan have templates, load the first one with a non-null template; confirm dialog before replacing: "Muat template dari [layanan]? Milestone yang ada akan digantikan.")
- "Tambah Milestone" button (adds blank row, focuses nama input)

Milestone list (not `DataTable` — custom layout):

| ↑↓ | Nama | Assignee | Target | Aktual | Status | Pemicu |
|---|---|---|---|---|---|---|
| buttons | `input` (blur=save) | `select` (blur=save) | `input[type=date]` | `input[type=date]` | `select` styled as badge | `Badge "Tagih X%"` link |

- **"Tagih X%" badge**: rendered only when `status === "selesai"` AND `pemicuTermin !== null`; `Badge variant="warning"` wrapping a `Link` to `/faktur/[pemicuTermin.fakturId]`
- Reorder via ↑/↓ icon buttons (swaps `urutan`, triggers `useUpdateMilestone`)
- Delete icon button (confirm inline or small toast undo — keep simple, no dialog needed for milestones)
- Blank row added by "Tambah Milestone" auto-focuses the nama input

#### Tab 2 — Info Proyek

Read-only `InfoList` / `InfoRow` (from `shared/detail-drawer`):
- Area, Tahun, Nilai Kontrak (full IDR), Layanan (comma-separated or badges), SPH (linked ID → `/penawaran/[sphId]`), Dibuat (formatted date)

#### Tab 3 — Log Aktivitas

Chronological feed (newest first):
- Each entry: timestamp (formatted `id-ID`), description string
- Empty state: "Belum ada aktivitas."

---

## 4. Penawaran Page Changes

Row action menu additions for `deal`-status SPHs:

```
// sph.status === "deal" && no linked proyek:
<DropdownMenuItem onClick={() => router.push(`/proyek/baru?sphId=${sph.id}`)}>
  <FolderKanban /> Buat Proyek
</DropdownMenuItem>

// sph.status === "deal" && linked proyek exists (sphId found in proyek fixtures):
<DropdownMenuItem onClick={() => router.push(`/proyek/${linkedProyekId}`)}>
  <FolderKanban /> Lihat Proyek
</DropdownMenuItem>
```

The lookup `sphId → proyekId` is done by calling `listProyek()` once in the page and building a `Map<sphId, proyekId>` for O(1) lookup per row.

---

## 5. Status Workflow

| From | To (allowed) |
|---|---|
| `po_kontrak` | `collecting_data`, `batal` |
| `collecting_data` | `drafting`, `batal` |
| `drafting` | `tunggu_pengesahan`, `batal` |
| `tunggu_pengesahan` | `pending`, `selesai` |
| `pending` | `drafting`, `selesai` |
| `selesai` | — (terminal) |
| `batal` | — (terminal) |

Status labels (Bahasa Indonesia):

| Value | Label |
|---|---|
| `po_kontrak` | PO/Kontrak |
| `collecting_data` | Pengumpulan Data |
| `drafting` | Penyusunan |
| `tunggu_pengesahan` | Tunggu Pengesahan |
| `pending` | Pending |
| `selesai` | Selesai |
| `batal` | Batal |

---

## 6. Tests — `src/lib/__tests__/proyek-data.test.ts`

```
describe listProyek:
  - returns all seeded projects
  - filters by nama
  - filters by perusahaanNama

describe getProyek:
  - returns project by id
  - returns null for unknown id

describe updateProyekStatus:
  - updates status correctly
  - appends a log entry

describe updateMilestone:
  - patches milestone fields
  - appends log entry when status → selesai

describe addMilestone / deleteMilestone:
  - adds milestone with correct urutan
  - deletes milestone and re-indexes urutan
```

Expected: existing 72 + ~10 new = ~82 passing.

---

## 7. Scope Boundaries

**In scope:**
- Project list, create (from SPH Deal), detail (tabs: Milestone, Info, Log)
- Inline milestone editing (nama, assignee, dates, status)
- Milestone template loading from katalog
- "Tagih X%" termin trigger badge linking to faktur
- Status workflow with confirm dialog for `batal`
- Activity log (status changes + milestone completions)
- "Buat Proyek" / "Lihat Proyek" in Penawaran row menu

**Explicitly out of scope:**
- Gantt chart
- Comments / mentions / file attachments
- Realisasi RAB & profitability panel
- Laporan Semester berulang
- RBAC enforcement (prototype has no auth)
