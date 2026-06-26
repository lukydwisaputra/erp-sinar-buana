# Frontend Prototype — Phase 3 · Proyek (Project Management) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Proyek module — project list, create (from Deal SPH), tabbed detail page with inline-editable milestones, status workflow, termin-trigger badges, and activity log.

**Architecture:** Follows the same mock-data spine as existing modules (`schemas/ → fixtures/ → data/ → query/ → app pages`). Milestones are embedded in the Proyek fixture (same pattern as termins in Faktur). A separate in-memory log store accumulates status-change and milestone-completion entries. The detail page is a server component that pre-fetches the project and passes it to a client component with three tabs.

**Tech Stack:** TypeScript · Next.js 15 App Router (server + client components) · TanStack Query · Zod · shadcn/ui (DataTable, Tabs, Badge, Avatar, Sheet, AlertDialog, DropdownMenu) · `formatRupiah`/`formatRupiahCompact` · Lucide · Vitest

---

## File Structure

```
src/
  lib/
    schemas/proyek.ts                    NEW
    fixtures/proyek.ts                   NEW
    data/proyek.ts                       NEW
    query/proyek.ts                      NEW
    __tests__/proyek-data.test.ts        NEW
  app/(app)/
    proyek/
      page.tsx                           REPLACE placeholder → list
      baru/page.tsx                      NEW — server page, reads searchParams, passes SPH to form
      [id]/page.tsx                      NEW — server page, fetches proyek, passes to detail component
  components/proyek/
    proyek-create.tsx                    NEW — client create form
    proyek-detail.tsx                    NEW — client detail (header + tabs: Milestone / Info / Log)
  app/(app)/penawaran/page.tsx           MODIFY — add "Buat Proyek" / "Lihat Proyek" to row menu
```

---

## Task 1: Schema + Failing Tests

**Files:** Create `src/lib/schemas/proyek.ts`; create `src/lib/__tests__/proyek-data.test.ts`.

- [ ] **Step 1: Write the schema**

Create `src/lib/schemas/proyek.ts`:

```ts
import { z } from "zod";

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
  targetDate: z.string().nullable(),
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
  perusahaanNama: z.string(),
  area: z.string(),
  tahun: z.number(),
  layananNama: z.array(z.string()),
  status: proyekStatus,
  nilaiKontrak: z.number(),
  sphId: z.string().nullable(),
  assignees: z.array(z.object({
    karyawanId: z.string(),
    nama: z.string(),
  })),
  milestones: z.array(milestoneSchema),
  createdAt: z.string(),
});

export type Proyek = z.infer<typeof proyekSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;
export type ProyekStatus = z.infer<typeof proyekStatus>;
export type MilestoneStatus = z.infer<typeof milestoneStatus>;
```

- [ ] **Step 2: Write failing tests**

Create `src/lib/__tests__/proyek-data.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  listProyek, getProyek, createProyek,
  updateProyekStatus, updateMilestone, moveMilestone,
  addMilestone, deleteMilestone, listProyekLog,
} from "@/lib/data/proyek";

describe("listProyek", () => {
  it("returns all seeded projects", async () => {
    const rows = await listProyek();
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows[0]).toMatchObject({ id: expect.any(String), status: expect.any(String) });
  });
  it("filters by nama", async () => {
    const rows = await listProyek({ q: "Pertek" });
    expect(rows.length).toBeGreaterThanOrEqual(1);
    rows.forEach((r) => expect(r.nama.toLowerCase()).toContain("pertek"));
  });
  it("filters by perusahaanNama", async () => {
    const rows = await listProyek({ q: "maju" });
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});

describe("getProyek", () => {
  it("returns a project by id", async () => {
    const p = await getProyek("PRJ-001");
    expect(p?.id).toBe("PRJ-001");
    expect(p?.milestones.length).toBeGreaterThan(0);
  });
  it("returns null for unknown id", async () => {
    expect(await getProyek("NOPE")).toBeNull();
  });
});

describe("updateProyekStatus", () => {
  it("updates status and appends a log entry", async () => {
    await updateProyekStatus("PRJ-002", "drafting");
    const p = await getProyek("PRJ-002");
    expect(p?.status).toBe("drafting");
    const log = await listProyekLog("PRJ-002");
    expect(log.some((e) => e.description.includes("drafting"))).toBe(true);
  });
  it("throws for unknown id", async () => {
    await expect(updateProyekStatus("PRJ-999", "selesai")).rejects.toThrow();
  });
});

describe("updateMilestone", () => {
  it("patches milestone fields", async () => {
    const p = await getProyek("PRJ-001");
    const m = p!.milestones[2];
    await updateMilestone("PRJ-001", m.id, { nama: "Updated Name" });
    const updated = await getProyek("PRJ-001");
    expect(updated!.milestones.find((x) => x.id === m.id)?.nama).toBe("Updated Name");
  });
  it("appends log entry when status changes to selesai", async () => {
    const p = await getProyek("PRJ-001");
    const m = p!.milestones.find((x) => x.status !== "selesai")!;
    await updateMilestone("PRJ-001", m.id, { status: "selesai" });
    const log = await listProyekLog("PRJ-001");
    expect(log.some((e) => e.description.includes("selesai"))).toBe(true);
  });
});

describe("addMilestone / deleteMilestone", () => {
  it("adds a milestone with next urutan", async () => {
    const before = await getProyek("PRJ-001");
    const maxUrutan = Math.max(...before!.milestones.map((m) => m.urutan));
    await addMilestone("PRJ-001", {
      id: "ML-TEST-1",
      nama: "Test Milestone",
      urutan: maxUrutan + 1,
      assigneeNama: null,
      targetDate: null,
      actualDate: null,
      status: "belum_mulai",
      pemicuTermin: null,
    });
    const after = await getProyek("PRJ-001");
    expect(after!.milestones.find((m) => m.id === "ML-TEST-1")).toBeDefined();
  });
  it("deletes a milestone and re-indexes urutan", async () => {
    const before = await getProyek("PRJ-001");
    const target = before!.milestones.find((m) => m.id === "ML-TEST-1")!;
    await deleteMilestone("PRJ-001", target.id);
    const after = await getProyek("PRJ-001");
    expect(after!.milestones.find((m) => m.id === "ML-TEST-1")).toBeUndefined();
    const urtans = after!.milestones.map((m) => m.urutan).sort((a, b) => a - b);
    urtans.forEach((u, i) => expect(u).toBe(i + 1));
  });
});

describe("moveMilestone", () => {
  it("moves a milestone up by swapping urutan with its predecessor", async () => {
    const before = await getProyek("PRJ-001");
    const sorted = [...before!.milestones].sort((a, b) => a.urutan - b.urutan);
    const second = sorted[1];
    const first = sorted[0];
    await moveMilestone("PRJ-001", second.id, "up");
    const after = await getProyek("PRJ-001");
    const updatedSecond = after!.milestones.find((m) => m.id === second.id)!;
    const updatedFirst = after!.milestones.find((m) => m.id === first.id)!;
    expect(updatedSecond.urutan).toBe(first.urutan);
    expect(updatedFirst.urutan).toBe(second.urutan);
  });
});

describe("createProyek", () => {
  it("creates a project with generated id and empty milestones", async () => {
    const p = await createProyek({
      nama: "Test Proyek",
      perusahaanId: "PRSH-001",
      perusahaanNama: "PT Test",
      area: "Jakarta",
      tahun: 2026,
      layananNama: ["Test Layanan"],
      nilaiKontrak: 50_000_000,
      sphId: null,
      assignees: [],
    });
    expect(p.id).toMatch(/^PRJ-/);
    expect(p.milestones).toHaveLength(0);
    const found = await getProyek(p.id);
    expect(found?.nama).toBe("Test Proyek");
  });
});
```

- [ ] **Step 3: Run tests — confirm they all fail**

```bash
npm test -- proyek-data
```

Expected: all tests fail with "Cannot find module '@/lib/data/proyek'".

- [ ] **Step 4: Commit schema + failing tests**

```bash
git add src/lib/schemas/proyek.ts src/lib/__tests__/proyek-data.test.ts
git commit -m "test(proyek): add failing tests for proyek data layer"
```

---

## Task 2: Fixtures + Data Functions (make tests pass)

**Files:** Create `src/lib/fixtures/proyek.ts`; create `src/lib/data/proyek.ts`.

- [ ] **Step 1: Write fixtures**

Create `src/lib/fixtures/proyek.ts`:

```ts
import type { Proyek } from "@/lib/schemas/proyek";

export const proyekFixtures: Proyek[] = [
  {
    id: "PRJ-001",
    nama: "Pertek Air Limbah — PT Maju Bersama Industri",
    perusahaanId: "PRSH-001",
    perusahaanNama: "PT Maju Bersama Industri",
    area: "Jakarta Selatan",
    tahun: 2026,
    layananNama: ["Penyusunan Pertek Air Limbah", "Laporan Pelaksanaan RKL-RPL Semester"],
    status: "drafting",
    nilaiKontrak: 125_000_000,
    sphId: "SPH/001/5.2026",
    assignees: [
      { karyawanId: "KRY-003", nama: "Agus Setiawan" },
      { karyawanId: "KRY-004", nama: "Dewi Anggraini" },
    ],
    milestones: [
      { id: "ML-001-1", nama: "Survey Lokasi", urutan: 1, assigneeNama: "Agus Setiawan", targetDate: "2026-04-15", actualDate: "2026-04-18", status: "selesai", pemicuTermin: null },
      { id: "ML-001-2", nama: "Pengumpulan Data & Berkas Administrasi", urutan: 2, assigneeNama: "Dewi Anggraini", targetDate: "2026-05-01", actualDate: "2026-05-03", status: "selesai", pemicuTermin: null },
      { id: "ML-001-3", nama: "Penyusunan Dokumen", urutan: 3, assigneeNama: "Agus Setiawan", targetDate: "2026-05-20", actualDate: null, status: "on_track", pemicuTermin: { fakturId: "INV/001/2026-T2", persen: 30 } },
      { id: "ML-001-4", nama: "Asistensi dengan Dinas LH", urutan: 4, assigneeNama: "Agus Setiawan", targetDate: "2026-06-10", actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { id: "ML-001-5", nama: "Penerbitan Dokumen", urutan: 5, assigneeNama: null, targetDate: "2026-06-30", actualDate: null, status: "belum_mulai", pemicuTermin: null },
    ],
    createdAt: "2026-05-04T09:00:00.000Z",
  },
  {
    id: "PRJ-002",
    nama: "Dokumen AMDAL — PT Karya Logam",
    perusahaanId: "PRSH-003",
    perusahaanNama: "PT Karya Logam Nusantara Sejahtera Abadi Makmur",
    area: "Kawasan Industri SIER, Surabaya",
    tahun: 2026,
    layananNama: ["Dokumen AMDAL"],
    status: "collecting_data",
    nilaiKontrak: 350_000_000,
    sphId: "SPH/002/5.2026",
    assignees: [
      { karyawanId: "KRY-003", nama: "Agus Setiawan" },
    ],
    milestones: [
      { id: "ML-002-1", nama: "Survey Lokasi", urutan: 1, assigneeNama: "Agus Setiawan", targetDate: "2026-05-10", actualDate: "2026-05-12", status: "selesai", pemicuTermin: null },
      { id: "ML-002-2", nama: "Pengumpulan Data & Berkas Administrasi", urutan: 2, assigneeNama: "Dewi Anggraini", targetDate: "2026-06-01", actualDate: null, status: "on_track", pemicuTermin: null },
      { id: "ML-002-3", nama: "Penyusunan Dokumen Kerangka Acuan (KA)", urutan: 3, assigneeNama: "Agus Setiawan", targetDate: "2026-07-01", actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { id: "ML-002-4", nama: "Penyusunan Draft ANDAL & RKL-RPL", urutan: 4, assigneeNama: "Agus Setiawan", targetDate: "2026-08-01", actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { id: "ML-002-5", nama: "Rapat Pembahasan dengan Komisi AMDAL", urutan: 5, assigneeNama: null, targetDate: "2026-09-01", actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { id: "ML-002-6", nama: "Penerbitan Dokumen AMDAL", urutan: 6, assigneeNama: null, targetDate: "2026-10-01", actualDate: null, status: "belum_mulai", pemicuTermin: null },
    ],
    createdAt: "2026-05-10T10:00:00.000Z",
  },
  {
    id: "PRJ-003",
    nama: "Pertek Emisi Udara — PT Cahaya Teknik Mandiri",
    perusahaanId: "PRSH-006",
    perusahaanNama: "PT Cahaya Teknik Mandiri",
    area: "Medan Kota",
    tahun: 2026,
    layananNama: ["Persetujuan Teknis Emisi Udara"],
    status: "tunggu_pengesahan",
    nilaiKontrak: 68_000_000,
    sphId: "SPH/004/6.2026",
    assignees: [
      { karyawanId: "KRY-003", nama: "Agus Setiawan" },
      { karyawanId: "KRY-005", nama: "Fajar Ramadhan" },
    ],
    milestones: [
      { id: "ML-003-1", nama: "Survey Lokasi", urutan: 1, assigneeNama: "Agus Setiawan", targetDate: "2026-05-20", actualDate: "2026-05-21", status: "selesai", pemicuTermin: null },
      { id: "ML-003-2", nama: "Pengumpulan Data", urutan: 2, assigneeNama: "Fajar Ramadhan", targetDate: "2026-06-01", actualDate: "2026-06-03", status: "selesai", pemicuTermin: null },
      { id: "ML-003-3", nama: "Penyusunan Dokumen Pertek", urutan: 3, assigneeNama: "Agus Setiawan", targetDate: "2026-06-20", actualDate: "2026-06-22", status: "selesai", pemicuTermin: { fakturId: "INV/004/2026-T1", persen: 40 } },
      { id: "ML-003-4", nama: "Tunggu Pengesahan Dinas", urutan: 4, assigneeNama: null, targetDate: "2026-07-15", actualDate: null, status: "on_track", pemicuTermin: null },
    ],
    createdAt: "2026-06-01T08:30:00.000Z",
  },
  {
    id: "PRJ-004",
    nama: "Laporan RKL-RPL Semester — PT Delta Nusantara",
    perusahaanId: "PRSH-002",
    perusahaanNama: "PT Delta Nusantara Prima",
    area: "Bekasi",
    tahun: 2025,
    layananNama: ["Laporan Pelaksanaan RKL-RPL Semester"],
    status: "selesai",
    nilaiKontrak: 50_000_000,
    sphId: null,
    assignees: [
      { karyawanId: "KRY-004", nama: "Dewi Anggraini" },
    ],
    milestones: [
      { id: "ML-004-1", nama: "Pengumpulan Data Lapangan", urutan: 1, assigneeNama: "Dewi Anggraini", targetDate: "2025-11-10", actualDate: "2025-11-12", status: "selesai", pemicuTermin: null },
      { id: "ML-004-2", nama: "Penyusunan Laporan Semester I", urutan: 2, assigneeNama: "Dewi Anggraini", targetDate: "2025-11-30", actualDate: "2025-12-02", status: "selesai", pemicuTermin: null },
      { id: "ML-004-3", nama: "Revisi & Finalisasi", urutan: 3, assigneeNama: "Agus Setiawan", targetDate: "2025-12-15", actualDate: "2025-12-14", status: "selesai", pemicuTermin: null },
      { id: "ML-004-4", nama: "Penyerahan Laporan ke LH", urutan: 4, assigneeNama: null, targetDate: "2025-12-20", actualDate: "2025-12-20", status: "selesai", pemicuTermin: null },
    ],
    createdAt: "2025-11-01T09:00:00.000Z",
  },
];
```

- [ ] **Step 2: Write data functions**

Create `src/lib/data/proyek.ts`:

```ts
import { delay } from "@/lib/data/_delay";
import { proyekFixtures } from "@/lib/fixtures/proyek";
import { proyekSchema, type Proyek, type ProyekStatus, type Milestone, type MilestoneStatus } from "@/lib/schemas/proyek";
import { katalogFixtures } from "@/lib/fixtures/katalog";

export type ListProyekParams = { q?: string };

export type ProyekLogEntry = {
  id: string;
  proyekId: string;
  timestamp: string;
  description: string;
};

export type ProyekCreateInput = Omit<Proyek, "id" | "milestones" | "createdAt">;

const logStore: ProyekLogEntry[] = [];
let _logId = 1;
let _proyekSeq = 5;

function appendLog(proyekId: string, description: string) {
  logStore.push({
    id: `LOG-${String(_logId++).padStart(4, "0")}`,
    proyekId,
    timestamp: new Date().toISOString(),
    description,
  });
}

export async function listProyek(params: ListProyekParams = {}): Promise<Proyek[]> {
  await delay();
  const rows = proyekSchema.array().parse(proyekFixtures);
  if (!params.q) return rows;
  const q = params.q.toLowerCase();
  return rows.filter(
    (r) => r.nama.toLowerCase().includes(q) || r.perusahaanNama.toLowerCase().includes(q),
  );
}

export async function getProyek(id: string): Promise<Proyek | null> {
  await delay(300);
  const row = proyekFixtures.find((r) => r.id === id);
  return row ? proyekSchema.parse(row) : null;
}

export async function createProyek(input: ProyekCreateInput): Promise<Proyek> {
  await delay(400);
  const id = `PRJ-${String(_proyekSeq++).padStart(3, "0")}`;
  const proyek: Proyek = {
    ...input,
    id,
    milestones: [],
    createdAt: new Date().toISOString(),
  };
  proyekFixtures.push(proyekSchema.parse(proyek));
  appendLog(id, `Proyek dibuat`);
  return proyekSchema.parse(proyekFixtures[proyekFixtures.length - 1]);
}

export async function updateProyekStatus(id: string, status: ProyekStatus): Promise<Proyek> {
  await delay(300);
  const idx = proyekFixtures.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Proyek ${id} not found`);
  const old = proyekFixtures[idx];
  const STATUS_LABELS: Record<ProyekStatus, string> = {
    po_kontrak: "PO/Kontrak", collecting_data: "Pengumpulan Data",
    drafting: "Penyusunan", tunggu_pengesahan: "Tunggu Pengesahan",
    pending: "Pending", selesai: "Selesai", batal: "Batal",
  };
  proyekFixtures[idx] = { ...old, status };
  appendLog(id, `Status diubah: ${STATUS_LABELS[old.status]} → ${STATUS_LABELS[status]}`);
  return proyekSchema.parse(proyekFixtures[idx]);
}

export async function updateMilestone(
  proyekId: string,
  milestoneId: string,
  patch: Partial<Omit<Milestone, "id" | "urutan">>,
): Promise<Proyek> {
  await delay(200);
  const idx = proyekFixtures.findIndex((p) => p.id === proyekId);
  if (idx === -1) throw new Error(`Proyek ${proyekId} not found`);
  const proyek = proyekFixtures[idx];
  const mIdx = proyek.milestones.findIndex((m) => m.id === milestoneId);
  if (mIdx === -1) throw new Error(`Milestone ${milestoneId} not found`);
  const oldMilestone = proyek.milestones[mIdx];
  const updated = { ...oldMilestone, ...patch };
  const milestones = [...proyek.milestones];
  milestones[mIdx] = updated;
  proyekFixtures[idx] = { ...proyek, milestones };
  if (patch.status === "selesai" && oldMilestone.status !== "selesai") {
    appendLog(proyekId, `Milestone "${updated.nama}" selesai`);
  }
  return proyekSchema.parse(proyekFixtures[idx]);
}

export async function moveMilestone(
  proyekId: string,
  milestoneId: string,
  direction: "up" | "down",
): Promise<Proyek> {
  await delay(100);
  const idx = proyekFixtures.findIndex((p) => p.id === proyekId);
  if (idx === -1) throw new Error(`Proyek ${proyekId} not found`);
  const proyek = proyekFixtures[idx];
  const sorted = [...proyek.milestones].sort((a, b) => a.urutan - b.urutan);
  const mIdx = sorted.findIndex((m) => m.id === milestoneId);
  const swapIdx = direction === "up" ? mIdx - 1 : mIdx + 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) return proyekSchema.parse(proyek);
  const tempUrutan = sorted[mIdx].urutan;
  sorted[mIdx] = { ...sorted[mIdx], urutan: sorted[swapIdx].urutan };
  sorted[swapIdx] = { ...sorted[swapIdx], urutan: tempUrutan };
  proyekFixtures[idx] = { ...proyek, milestones: sorted };
  return proyekSchema.parse(proyekFixtures[idx]);
}

export async function addMilestone(proyekId: string, milestone: Milestone): Promise<Proyek> {
  await delay(200);
  const idx = proyekFixtures.findIndex((p) => p.id === proyekId);
  if (idx === -1) throw new Error(`Proyek ${proyekId} not found`);
  const proyek = proyekFixtures[idx];
  proyekFixtures[idx] = { ...proyek, milestones: [...proyek.milestones, milestone] };
  return proyekSchema.parse(proyekFixtures[idx]);
}

export async function deleteMilestone(proyekId: string, milestoneId: string): Promise<Proyek> {
  await delay(200);
  const idx = proyekFixtures.findIndex((p) => p.id === proyekId);
  if (idx === -1) throw new Error(`Proyek ${proyekId} not found`);
  const proyek = proyekFixtures[idx];
  const remaining = proyek.milestones
    .filter((m) => m.id !== milestoneId)
    .sort((a, b) => a.urutan - b.urutan)
    .map((m, i) => ({ ...m, urutan: i + 1 }));
  proyekFixtures[idx] = { ...proyek, milestones: remaining };
  return proyekSchema.parse(proyekFixtures[idx]);
}

export async function listProyekLog(proyekId: string): Promise<ProyekLogEntry[]> {
  await delay(200);
  return logStore.filter((e) => e.proyekId === proyekId);
}

/** Returns the first katalog template milestones matching a layanan name in the project. */
export function getMilestoneTemplate(
  layananNama: string[],
): { templateName: string; milestones: Omit<Milestone, "id" | "urutan">[] } | null {
  const TEMPLATES: Record<string, Omit<Milestone, "id" | "urutan">[]> = {
    "Pertek 5 Tahap": [
      { nama: "Survey Lokasi", assigneeNama: null, targetDate: null, actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { nama: "Pengumpulan Data & Berkas Administrasi", assigneeNama: null, targetDate: null, actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { nama: "Penyusunan Dokumen", assigneeNama: null, targetDate: null, actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { nama: "Asistensi dengan Dinas LH", assigneeNama: null, targetDate: null, actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { nama: "Penerbitan Dokumen", assigneeNama: null, targetDate: null, actualDate: null, status: "belum_mulai", pemicuTermin: null },
    ],
    "AMDAL Lengkap": [
      { nama: "Survey Lokasi", assigneeNama: null, targetDate: null, actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { nama: "Pengumpulan Data & Berkas Administrasi", assigneeNama: null, targetDate: null, actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { nama: "Penyusunan Dokumen Kerangka Acuan (KA)", assigneeNama: null, targetDate: null, actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { nama: "Penyusunan Draft ANDAL & RKL-RPL", assigneeNama: null, targetDate: null, actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { nama: "Rapat Pembahasan dengan Komisi AMDAL", assigneeNama: null, targetDate: null, actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { nama: "Revisi Dokumen", assigneeNama: null, targetDate: null, actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { nama: "Penerbitan Dokumen AMDAL", assigneeNama: null, targetDate: null, actualDate: null, status: "belum_mulai", pemicuTermin: null },
    ],
    "UKL-UPL Standar": [
      { nama: "Survey Lokasi", assigneeNama: null, targetDate: null, actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { nama: "Pengumpulan Data", assigneeNama: null, targetDate: null, actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { nama: "Penyusunan Formulir UKL-UPL", assigneeNama: null, targetDate: null, actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { nama: "Asistensi dengan Dinas", assigneeNama: null, targetDate: null, actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { nama: "Revisi Dokumen", assigneeNama: null, targetDate: null, actualDate: null, status: "belum_mulai", pemicuTermin: null },
      { nama: "Pengesahan Dokumen", assigneeNama: null, targetDate: null, actualDate: null, status: "belum_mulai", pemicuTermin: null },
    ],
  };

  for (const nama of layananNama) {
    const katalog = katalogFixtures.find((k) => k.nama === nama && k.templateMilestone);
    if (katalog?.templateMilestone && TEMPLATES[katalog.templateMilestone]) {
      return { templateName: katalog.nama, milestones: TEMPLATES[katalog.templateMilestone] };
    }
  }
  return null;
}
```

- [ ] **Step 3: Run tests — confirm they all pass**

```bash
npm test -- proyek-data
```

Expected: all ~12 proyek tests pass.

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: 72 existing + ~12 new = ~84 passing, 0 failing.

- [ ] **Step 5: Run build**

```bash
npm run build
```

Expected: exit 0, no type errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/fixtures/proyek.ts src/lib/data/proyek.ts
git commit -m "feat(proyek): data layer — schema, fixtures, data functions, tests"
```

---

## Task 3: Query Hooks

**Files:** Create `src/lib/query/proyek.ts`.

- [ ] **Step 1: Write query hooks**

Create `src/lib/query/proyek.ts`:

```ts
"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listProyek, getProyek, createProyek, updateProyekStatus,
  updateMilestone, moveMilestone, addMilestone, deleteMilestone, listProyekLog,
  type ListProyekParams, type ProyekCreateInput,
} from "@/lib/data/proyek";
import type { Milestone, MilestoneStatus, ProyekStatus } from "@/lib/schemas/proyek";

export function useProyekList(params: ListProyekParams = {}) {
  return useQuery({ queryKey: ["proyek", params], queryFn: () => listProyek(params) });
}

export function useProyek(id: string) {
  return useQuery({ queryKey: ["proyek", id], queryFn: () => getProyek(id) });
}

export function useProyekLog(id: string) {
  return useQuery({ queryKey: ["proyek-log", id], queryFn: () => listProyekLog(id) });
}

export function useCreateProyek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProyekCreateInput) => createProyek(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["proyek"] }); },
    onError: () => { toast.error("Gagal membuat proyek. Coba lagi."); },
  });
}

export function useUpdateProyekStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProyekStatus }) =>
      updateProyekStatus(id, status),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["proyek", id] });
      qc.invalidateQueries({ queryKey: ["proyek"] });
      qc.invalidateQueries({ queryKey: ["proyek-log", id] });
    },
    onError: () => { toast.error("Gagal mengubah status proyek. Coba lagi."); },
  });
}

export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, milestoneId, patch }: {
      proyekId: string;
      milestoneId: string;
      patch: Partial<Omit<Milestone, "id" | "urutan">>;
    }) => updateMilestone(proyekId, milestoneId, patch),
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["proyek", proyekId] });
      qc.invalidateQueries({ queryKey: ["proyek-log", proyekId] });
    },
    onError: () => { toast.error("Gagal menyimpan perubahan milestone. Coba lagi."); },
  });
}

export function useMoveMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, milestoneId, direction }: {
      proyekId: string;
      milestoneId: string;
      direction: "up" | "down";
    }) => moveMilestone(proyekId, milestoneId, direction),
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["proyek", proyekId] });
    },
    onError: () => { toast.error("Gagal mengubah urutan milestone. Coba lagi."); },
  });
}

export function useAddMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, milestone }: { proyekId: string; milestone: Milestone }) =>
      addMilestone(proyekId, milestone),
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["proyek", proyekId] });
    },
    onError: () => { toast.error("Gagal menambah milestone. Coba lagi."); },
  });
}

export function useDeleteMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, milestoneId }: { proyekId: string; milestoneId: string }) =>
      deleteMilestone(proyekId, milestoneId),
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["proyek", proyekId] });
    },
    onError: () => { toast.error("Gagal menghapus milestone. Coba lagi."); },
  });
}
```

- [ ] **Step 2: Run build — confirm exit 0**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/query/proyek.ts
git commit -m "feat(proyek): query hooks"
```

---

## Task 4: Proyek List Page

**Files:** Replace `src/app/(app)/proyek/page.tsx`.

- [ ] **Step 1: Replace placeholder with the list page**

Replace the entire contents of `src/app/(app)/proyek/page.tsx`:

```tsx
"use client";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { FolderKanban } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { formatRupiahCompact } from "@/lib/format";
import { useProyekList } from "@/lib/query/proyek";
import type { Proyek, ProyekStatus } from "@/lib/schemas/proyek";

const STATUS: Record<ProyekStatus, { label: string; variant: "info" | "warning" | "success" | "destructive" | "secondary" }> = {
  po_kontrak:        { label: "PO/Kontrak",         variant: "info" },
  collecting_data:   { label: "Pengumpulan Data",    variant: "info" },
  drafting:          { label: "Penyusunan",          variant: "warning" },
  tunggu_pengesahan: { label: "Tunggu Pengesahan",   variant: "warning" },
  pending:           { label: "Pending",             variant: "secondary" },
  selesai:           { label: "Selesai",             variant: "success" },
  batal:             { label: "Batal",               variant: "destructive" },
};

function ProyekStatusBadge({ status }: { status: ProyekStatus }) {
  const s = STATUS[status];
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

export default function ProyekPage() {
  const router = useRouter();
  const { data, isLoading, isError, refetch } = useProyekList();

  const columns: ColumnDef<Proyek>[] = [
    {
      accessorKey: "id", header: "ID", meta: { mono: true },
      cell: ({ row }) => (
        <button type="button"
          onClick={() => router.push(`/proyek/${row.original.id}`)}
          className="rounded-sm font-mono text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.id}
        </button>
      ),
    },
    {
      accessorKey: "nama", header: "Nama Proyek", meta: { className: "min-w-56" },
      cell: ({ row }) => (
        <button type="button"
          onClick={() => router.push(`/proyek/${row.original.id}`)}
          className="rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.nama}
        </button>
      ),
    },
    { accessorKey: "perusahaanNama", header: "Perusahaan", meta: { className: "min-w-40" } },
    {
      accessorKey: "layananNama", header: "Layanan",
      cell: ({ row }) => {
        const names = row.original.layananNama;
        return (
          <div className="flex flex-wrap gap-1">
            {names.slice(0, 2).map((n) => <Badge key={n} variant="info" className="text-xs">{n}</Badge>)}
            {names.length > 2 && <Badge variant="secondary" className="text-xs">+{names.length - 2}</Badge>}
          </div>
        );
      },
    },
    {
      accessorKey: "status", header: "Status",
      cell: ({ row }) => <ProyekStatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "nilaiKontrak", header: "Nilai Kontrak",
      meta: { align: "right", mono: true },
      cell: ({ row }) => formatRupiahCompact(row.original.nilaiKontrak),
    },
    { accessorKey: "tahun", header: "Tahun", meta: { mono: true } },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FolderKanban className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Proyek</h1>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          searchColumn="nama"
          searchPlaceholder="Cari nama proyek atau perusahaan…"
          emptyMessage="Belum ada proyek"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Run build — confirm exit 0**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/proyek/page.tsx"
git commit -m "feat(proyek): project list page"
```

---

## Task 5: Create Page + Penawaran Row Menu

**Files:** Create `src/components/proyek/proyek-create.tsx`; create `src/app/(app)/proyek/baru/page.tsx`; modify `src/app/(app)/penawaran/page.tsx`.

- [ ] **Step 1: Create the `proyek-create` client component**

Create `src/components/proyek/proyek-create.tsx`:

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, FolderKanban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { SectionLabel } from "@/components/shared/detail-drawer";
import { formatRupiah } from "@/lib/format";
import { useCreateProyek } from "@/lib/query/proyek";
import { karyawanFixtures } from "@/lib/fixtures/karyawan";
import type { Sph } from "@/lib/schemas/penawaran";

const schema = z.object({
  nama: z.string().min(1, "Nama proyek wajib diisi."),
  area: z.string().min(1, "Area wajib diisi."),
  tahun: z.coerce.number().min(2020, "Tahun tidak valid."),
  assigneeIds: z.array(z.string()),
});
type FormValues = z.infer<typeof schema>;

const activeKaryawan = karyawanFixtures.filter((k) => k.status === "aktif");

export function ProyekCreate({ sph }: { sph: Sph }) {
  const router = useRouter();
  const createProyek = useCreateProyek();

  const defaultNama = `Proyek — ${sph.perusahaanNama}`;
  const layananNama = sph.items.map((i) => i.nama);
  const nilaiKontrak = sph.items.reduce((s, i) => s + i.harga * i.volume, 0);

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      nama: defaultNama,
      area: "",
      tahun: new Date().getFullYear(),
      assigneeIds: [],
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const assignees = activeKaryawan
      .filter((k) => values.assigneeIds.includes(k.id))
      .map((k) => ({ karyawanId: k.id, nama: k.nama }));

    const proyek = await createProyek.mutateAsync({
      nama: values.nama,
      perusahaanId: sph.perusahaanId,
      perusahaanNama: sph.perusahaanNama,
      area: values.area,
      tahun: values.tahun,
      layananNama,
      status: "po_kontrak",
      nilaiKontrak,
      sphId: sph.id,
      assignees,
    });
    router.push(`/proyek/${proyek.id}`);
  });

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 py-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="size-8">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex items-center gap-2">
          <FolderKanban className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Buat Proyek</h1>
        </div>
      </div>

      {/* Pre-filled readonly summary */}
      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-2">
        <SectionLabel>Dari SPH</SectionLabel>
        <p className="text-sm font-medium">{sph.perusahaanNama}</p>
        <p className="text-sm text-muted-foreground font-mono">{sph.id} · {formatRupiah(nilaiKontrak)}</p>
        <div className="flex flex-wrap gap-1 pt-1">
          {layananNama.map((n) => <Badge key={n} variant="info" className="text-xs">{n}</Badge>)}
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field data-invalid={!!errors.nama}>
          <FieldLabel htmlFor="p-nama">Nama Proyek</FieldLabel>
          <Input id="p-nama" aria-invalid={!!errors.nama} {...register("nama")} />
          <FieldError errors={errors.nama ? [errors.nama] : undefined} />
        </Field>

        <Field data-invalid={!!errors.area}>
          <FieldLabel htmlFor="p-area">Area / Kawasan</FieldLabel>
          <Input id="p-area" placeholder="mis. Kawasan Industri SIER, Surabaya" aria-invalid={!!errors.area} {...register("area")} />
          <FieldError errors={errors.area ? [errors.area] : undefined} />
        </Field>

        <Field data-invalid={!!errors.tahun}>
          <FieldLabel htmlFor="p-tahun">Tahun Pengerjaan</FieldLabel>
          <Input id="p-tahun" type="number" inputMode="numeric" aria-invalid={!!errors.tahun} {...register("tahun")} />
          <FieldError errors={errors.tahun ? [errors.tahun] : undefined} />
        </Field>

        <div className="space-y-2">
          <SectionLabel>Assignee (opsional)</SectionLabel>
          <Controller
            control={control}
            name="assigneeIds"
            render={({ field }) => (
              <div className="space-y-2">
                {activeKaryawan.map((k) => (
                  <label key={k.id} className="flex cursor-pointer items-center gap-2.5">
                    <Checkbox
                      checked={field.value.includes(k.id)}
                      onCheckedChange={(checked) => {
                        field.onChange(
                          checked
                            ? [...field.value, k.id]
                            : field.value.filter((id) => id !== k.id),
                        );
                      }}
                    />
                    <span className="text-sm">{k.nama}</span>
                    <span className="text-xs text-muted-foreground">{k.jabatan}</span>
                  </label>
                ))}
              </div>
            )}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => router.back()}>Batal</Button>
          <Button type="submit" loading={isSubmitting || createProyek.isPending}>
            Buat Proyek
          </Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Create the server page**

Create `src/app/(app)/proyek/baru/page.tsx`:

```tsx
import { redirect } from "next/navigation";
import { getPenawaran } from "@/lib/data/penawaran";
import { ProyekCreate } from "@/components/proyek/proyek-create";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ sphId?: string }>;
}) {
  const { sphId } = await searchParams;
  if (!sphId) redirect("/penawaran");
  const sph = await getPenawaran(decodeURIComponent(sphId));
  if (!sph || sph.status !== "deal") redirect("/penawaran");
  return <ProyekCreate sph={sph} />;
}
```

- [ ] **Step 3: Modify the Penawaran page row menu**

In `src/app/(app)/penawaran/page.tsx`, make three changes:

**3a.** Add imports at the top (after existing imports):
```tsx
import { useProyekList } from "@/lib/query/proyek";
```
Also add `FolderKanban` to the existing Lucide import line (it's already imported — verify it's there, if not add it).

**3b.** Inside `PenawaranPage()`, after the existing mutation declarations, add:
```tsx
const { data: proyekList } = useProyekList();
const sphToProyekId = React.useMemo(() => {
  const map = new Map<string, string>();
  proyekList?.forEach((p) => { if (p.sphId) map.set(p.sphId, p.id); });
  return map;
}, [proyekList]);
```

**3c.** Inside the columns `cell` for the `actions` column, find the `DropdownMenuContent` block. After the existing `<DropdownMenuSeparator />` before "Ubah", add this block:

```tsx
{/* Proyek — only for deal status */}
{isDeal && (
  <>
    <DropdownMenuSeparator />
    {sphToProyekId.has(sph.id) ? (
      <DropdownMenuItem
        onSelect={() => router.push(`/proyek/${sphToProyekId.get(sph.id)}`)}
      >
        <FolderKanban className="mr-2 size-4" /> Lihat Proyek
      </DropdownMenuItem>
    ) : (
      <DropdownMenuItem
        onSelect={() => router.push(`/proyek/baru?sphId=${encodeURIComponent(sph.id)}`)}
      >
        <FolderKanban className="mr-2 size-4" /> Buat Proyek
      </DropdownMenuItem>
    )}
  </>
)}
```

- [ ] **Step 4: Run build — confirm exit 0**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/components/proyek/proyek-create.tsx "src/app/(app)/proyek/baru/page.tsx" "src/app/(app)/penawaran/page.tsx"
git commit -m "feat(proyek): create page + Buat/Lihat Proyek in Penawaran row menu"
```

---

## Task 6: Detail Page — Header + Tab Shell + Info + Log Tabs

**Files:** Create `src/app/(app)/proyek/[id]/page.tsx`; create `src/components/proyek/proyek-detail.tsx` (header + tab shell + Info + Log — no Milestone tab yet).

- [ ] **Step 1: Create the server page**

Create `src/app/(app)/proyek/[id]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { getProyek } from "@/lib/data/proyek";
import { ProyekDetail } from "@/components/proyek/proyek-detail";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const proyek = await getProyek(id);
  if (!proyek) notFound();
  return <ProyekDetail proyek={proyek} />;
}
```

- [ ] **Step 2: Create the client detail component (header + Info + Log, Milestone tab placeholder)**

Create `src/components/proyek/proyek-detail.tsx`:

```tsx
"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderKanban, Building2, MapPin, CalendarDays, Banknote, ExternalLink, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InfoRow, InfoList, SectionLabel } from "@/components/shared/detail-drawer";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import { useUpdateProyekStatus, useProyekLog } from "@/lib/query/proyek";
import type { Proyek, ProyekStatus } from "@/lib/schemas/proyek";

const STATUS: Record<ProyekStatus, { label: string; variant: "info" | "warning" | "success" | "destructive" | "secondary" }> = {
  po_kontrak:        { label: "PO/Kontrak",         variant: "info" },
  collecting_data:   { label: "Pengumpulan Data",    variant: "info" },
  drafting:          { label: "Penyusunan",          variant: "warning" },
  tunggu_pengesahan: { label: "Tunggu Pengesahan",   variant: "warning" },
  pending:           { label: "Pending",             variant: "secondary" },
  selesai:           { label: "Selesai",             variant: "success" },
  batal:             { label: "Batal",               variant: "destructive" },
};

const TRANSITIONS: Record<ProyekStatus, ProyekStatus[]> = {
  po_kontrak:        ["collecting_data", "batal"],
  collecting_data:   ["drafting", "batal"],
  drafting:          ["tunggu_pengesahan", "batal"],
  tunggu_pengesahan: ["pending", "selesai"],
  pending:           ["drafting", "selesai"],
  selesai:           [],
  batal:             [],
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function tanggalID(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function InfoTab({ proyek }: { proyek: Proyek }) {
  return (
    <div className="mt-4 max-w-lg">
      <InfoList>
        <InfoRow label="Perusahaan" value={proyek.perusahaanNama} />
        <InfoRow label="Area" value={proyek.area} />
        <InfoRow label="Tahun" value={String(proyek.tahun)} />
        <InfoRow
          label="Layanan"
          value={
            <div className="flex flex-wrap gap-1">
              {proyek.layananNama.map((n) => <Badge key={n} variant="info" className="text-xs">{n}</Badge>)}
            </div>
          }
        />
        <InfoRow
          label="Nilai Kontrak"
          value={<span className="font-mono tabular-nums">{formatRupiah(proyek.nilaiKontrak)}</span>}
        />
        {proyek.sphId && (
          <InfoRow
            label="SPH"
            value={
              <Link
                href={`/penawaran/${encodeURIComponent(proyek.sphId)}`}
                className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
              >
                {proyek.sphId} <ExternalLink className="size-3" />
              </Link>
            }
          />
        )}
        <InfoRow label="Dibuat" value={tanggalID(proyek.createdAt)} />
      </InfoList>
    </div>
  );
}

function LogTab({ proyekId }: { proyekId: string }) {
  const { data: log = [], isLoading } = useProyekLog(proyekId);
  const sorted = [...log].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  if (isLoading) return <p className="mt-4 text-sm text-muted-foreground">Memuat log…</p>;
  if (sorted.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">Belum ada aktivitas.</p>;
  }

  return (
    <ul className="mt-4 space-y-3">
      {sorted.map((entry) => (
        <li key={entry.id} className="flex items-start gap-3">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm">{entry.description}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(entry.timestamp).toLocaleString("id-ID")}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProyekDetail({ proyek }: { proyek: Proyek }) {
  const router = useRouter();
  const updateStatus = useUpdateProyekStatus();
  const [statusTarget, setStatusTarget] = React.useState<ProyekStatus | null>(null);
  const nextStatuses = TRANSITIONS[proyek.status];

  const handleConfirmStatus = () => {
    if (!statusTarget) return;
    updateStatus.mutate(
      { id: proyek.id, status: statusTarget },
      {
        onSuccess: () => {
          toast.success(`Status diubah: ${STATUS[statusTarget].label}`);
          setStatusTarget(null);
          router.refresh();
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <FolderKanban className="size-5 text-muted-foreground shrink-0" />
              <h1 className="text-xl font-semibold tracking-tight leading-tight">{proyek.nama}</h1>
              <Badge variant={STATUS[proyek.status].variant}>{STATUS[proyek.status].label}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Building2 className="size-3.5" />{proyek.perusahaanNama}</span>
              <span className="flex items-center gap-1"><MapPin className="size-3.5" />{proyek.area}</span>
              <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />{proyek.tahun}</span>
              <span className="flex items-center gap-1 font-mono tabular-nums" title={formatRupiah(proyek.nilaiKontrak)}>
                <Banknote className="size-3.5" />{formatRupiahCompact(proyek.nilaiKontrak)}
              </span>
            </div>
          </div>

          {/* Status change dropdown */}
          {nextStatuses.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">Ubah Status</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {nextStatuses.filter((s) => s !== "batal").map((s) => (
                  <DropdownMenuItem key={s} onSelect={() => setStatusTarget(s)}>
                    {STATUS[s].label}
                  </DropdownMenuItem>
                ))}
                {nextStatuses.includes("batal") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setStatusTarget("batal")}>
                      Batalkan Proyek
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Assignees */}
        {proyek.assignees.length > 0 && (
          <div className="flex items-center gap-1.5">
            {proyek.assignees.map((a) => (
              <Avatar key={a.karyawanId} className="size-7" title={a.nama}>
                <AvatarFallback className="text-[10px]">{initials(a.nama)}</AvatarFallback>
              </Avatar>
            ))}
            <span className="text-xs text-muted-foreground ml-1">
              {proyek.assignees.map((a) => a.nama).join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="milestone">
        <TabsList>
          <TabsTrigger value="milestone">Milestone</TabsTrigger>
          <TabsTrigger value="info">Info Proyek</TabsTrigger>
          <TabsTrigger value="log">Log Aktivitas</TabsTrigger>
        </TabsList>
        <TabsContent value="milestone">
          <p className="mt-4 text-sm text-muted-foreground">Milestone — segera hadir.</p>
        </TabsContent>
        <TabsContent value="info">
          <InfoTab proyek={proyek} />
        </TabsContent>
        <TabsContent value="log">
          <LogTab proyekId={proyek.id} />
        </TabsContent>
      </Tabs>

      {/* Status confirm dialog */}
      <AlertDialog open={!!statusTarget} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusTarget === "batal" ? "Batalkan proyek ini?" : `Ubah status ke ${statusTarget ? STATUS[statusTarget].label : ""}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget === "batal"
                ? "Status proyek akan berubah menjadi Batal. Tindakan ini tidak dapat dibatalkan."
                : "Status proyek akan diperbarui."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant={statusTarget === "batal" ? "destructive" : "default"}
              disabled={updateStatus.isPending}
              onClick={handleConfirmStatus}
            >
              {statusTarget === "batal" ? "Ya, Batalkan" : "Ubah Status"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 3: Run build — confirm exit 0**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/proyek/[id]/page.tsx" src/components/proyek/proyek-detail.tsx
git commit -m "feat(proyek): detail page — header, Info and Log tabs"
```

---

## Task 7: Milestone Tab

**Files:** Modify `src/components/proyek/proyek-detail.tsx` — replace the "Milestone — segera hadir" placeholder with the full inline-editable milestone tab.

- [ ] **Step 1: Add the MilestoneTab and MilestoneRow to `proyek-detail.tsx`**

At the top of the file, add additional imports:

```tsx
import { ChevronUp, ChevronDown, Trash2, Plus, LayoutList } from "lucide-react";
import { useUpdateMilestone, useMoveMilestone, useAddMilestone, useDeleteMilestone } from "@/lib/query/proyek";
import { getMilestoneTemplate } from "@/lib/data/proyek";
import type { Milestone, MilestoneStatus } from "@/lib/schemas/proyek";
import { karyawanFixtures } from "@/lib/fixtures/karyawan";
```

Add these constants after the existing `TRANSITIONS` constant:

```tsx
const MILESTONE_STATUS_OPTIONS: { value: MilestoneStatus; label: string }[] = [
  { value: "belum_mulai", label: "Belum Mulai" },
  { value: "on_track",    label: "On Track" },
  { value: "terlambat",   label: "Terlambat" },
  { value: "selesai",     label: "Selesai" },
];

const MILESTONE_STATUS_STYLE: Record<MilestoneStatus, string> = {
  belum_mulai: "text-muted-foreground",
  on_track:    "text-blue-600 dark:text-blue-400",
  terlambat:   "text-amber-600 dark:text-amber-400",
  selesai:     "text-green-600 dark:text-green-400",
};

const activeKaryawan = karyawanFixtures.filter((k) => k.status === "aktif");
```

Add the `MilestoneRow` component (before `InfoTab`):

```tsx
function MilestoneRow({
  m, proyekId, isFirst, isLast, autoFocus,
}: {
  m: Milestone;
  proyekId: string;
  isFirst: boolean;
  isLast: boolean;
  autoFocus?: boolean;
}) {
  const updateMilestone = useUpdateMilestone();
  const moveMilestone   = useMoveMilestone();
  const deleteMilestone = useDeleteMilestone();

  const [nama, setNama]           = React.useState(m.nama);
  const [targetDate, setTarget]   = React.useState(m.targetDate ?? "");
  const [actualDate, setActual]   = React.useState(m.actualDate ?? "");
  const namaRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { setNama(m.nama); }, [m.nama]);
  React.useEffect(() => { setTarget(m.targetDate ?? ""); }, [m.targetDate]);
  React.useEffect(() => { setActual(m.actualDate ?? ""); }, [m.actualDate]);
  React.useEffect(() => { if (autoFocus) namaRef.current?.focus(); }, [autoFocus]);

  const save = (patch: Partial<Omit<Milestone, "id" | "urutan">>) =>
    updateMilestone.mutate({ proyekId, milestoneId: m.id, patch });

  const inputCls = "w-full rounded px-1.5 py-0.5 text-sm bg-transparent outline-none ring-inset focus:ring-1 focus:ring-ring hover:bg-muted/50 transition-colors";

  return (
    <div className="grid items-center gap-2 border-b border-border px-2 py-1.5 last:border-0"
      style={{ gridTemplateColumns: "24px 1fr 130px 110px 110px 110px 80px 28px" }}>
      {/* Reorder */}
      <div className="flex flex-col gap-0">
        <button
          type="button"
          disabled={isFirst || moveMilestone.isPending}
          onClick={() => moveMilestone.mutate({ proyekId, milestoneId: m.id, direction: "up" })}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <ChevronUp className="size-3" />
        </button>
        <button
          type="button"
          disabled={isLast || moveMilestone.isPending}
          onClick={() => moveMilestone.mutate({ proyekId, milestoneId: m.id, direction: "down" })}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <ChevronDown className="size-3" />
        </button>
      </div>

      {/* Nama */}
      <input
        ref={namaRef}
        className={inputCls}
        value={nama}
        placeholder="Nama milestone…"
        onChange={(e) => setNama(e.target.value)}
        onBlur={() => { if (nama !== m.nama) save({ nama }); }}
      />

      {/* Assignee */}
      <select
        className={`${inputCls} cursor-pointer`}
        value={m.assigneeNama ?? ""}
        onChange={(e) => save({ assigneeNama: e.target.value || null })}
      >
        <option value="">—</option>
        {activeKaryawan.map((k) => (
          <option key={k.id} value={k.nama}>{k.nama}</option>
        ))}
      </select>

      {/* Target Date */}
      <input
        type="date"
        className={inputCls}
        value={targetDate}
        onChange={(e) => setTarget(e.target.value)}
        onBlur={() => {
          const val = targetDate || null;
          if (val !== m.targetDate) save({ targetDate: val });
        }}
      />

      {/* Actual Date */}
      <input
        type="date"
        className={inputCls}
        value={actualDate}
        onChange={(e) => setActual(e.target.value)}
        onBlur={() => {
          const val = actualDate || null;
          if (val !== m.actualDate) save({ actualDate: val });
        }}
      />

      {/* Status */}
      <select
        className={`${inputCls} cursor-pointer font-medium ${MILESTONE_STATUS_STYLE[m.status]}`}
        value={m.status}
        onChange={(e) => save({ status: e.target.value as MilestoneStatus })}
      >
        {MILESTONE_STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Tagih Termin badge */}
      <div className="flex items-center">
        {m.status === "selesai" && m.pemicuTermin && (
          <Link href={`/faktur/${encodeURIComponent(m.pemicuTermin.fakturId)}`}>
            <Badge variant="warning" className="cursor-pointer text-xs whitespace-nowrap">
              Tagih {m.pemicuTermin.persen}%
            </Badge>
          </Link>
        )}
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => {
          deleteMilestone.mutate({ proyekId, milestoneId: m.id }, {
            onSuccess: () => toast.success("Milestone dihapus."),
          });
        }}
        className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
        aria-label="Hapus milestone"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}
```

Add the `MilestoneTab` component (after `MilestoneRow`, before `InfoTab`):

```tsx
function MilestoneTab({ proyek }: { proyek: Proyek }) {
  const addMilestone = useAddMilestone();
  const [newId, setNewId] = React.useState<string | null>(null);
  const [templateConfirm, setTemplateConfirm] = React.useState(false);

  const sorted = [...proyek.milestones].sort((a, b) => a.urutan - b.urutan);
  const template = getMilestoneTemplate(proyek.layananNama);

  const handleAddMilestone = () => {
    const id = `ML-${Date.now()}`;
    const maxUrutan = sorted.length > 0 ? Math.max(...sorted.map((m) => m.urutan)) : 0;
    addMilestone.mutate(
      {
        proyekId: proyek.id,
        milestone: {
          id,
          nama: "",
          urutan: maxUrutan + 1,
          assigneeNama: null,
          targetDate: null,
          actualDate: null,
          status: "belum_mulai",
          pemicuTermin: null,
        },
      },
      { onSuccess: () => setNewId(id) },
    );
  };

  const replaceWithTemplate = () => {
    if (!template) return;
    const updateAll = useDeleteMilestone; // not used here — we need a batch replace
    // Implementation: delete each existing milestone then add template ones
    // Simpler: call updateProyek directly or use Promise.all
    // For the prototype: mutate the fixture store directly via a helper
    // We'll import and call replaceMilestonesWithTemplate from data/proyek
    import("@/lib/data/proyek").then(({ replaceMilestonesWithTemplate }) => {
      replaceMilestonesWithTemplate(proyek.id, template.milestones).then(() => {
        import("@tanstack/react-query").then(() => {
          // queryClient is not accessible here; use the hook result
          window.location.reload();
        });
      });
    });
    setTemplateConfirm(false);
  };

  return (
    <div className="mt-4 space-y-3">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {template && (
            <Button variant="outline" size="sm" onClick={() => setTemplateConfirm(true)}>
              <LayoutList className="size-3.5 mr-1.5" /> Muat Template
            </Button>
          )}
        </div>
        <Button size="sm" onClick={handleAddMilestone} disabled={addMilestone.isPending}>
          <Plus className="size-3.5 mr-1.5" /> Tambah Milestone
        </Button>
      </div>

      {/* Column headers */}
      {sorted.length > 0 && (
        <div
          className="grid items-center gap-2 px-2 pb-1 text-xs font-medium text-muted-foreground"
          style={{ gridTemplateColumns: "24px 1fr 130px 110px 110px 110px 80px 28px" }}
        >
          <span />
          <span>Nama</span>
          <span>Assignee</span>
          <span>Target</span>
          <span>Aktual</span>
          <span>Status</span>
          <span />
          <span />
        </div>
      )}

      {/* Rows */}
      <div className="rounded-lg border border-border">
        {sorted.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Belum ada milestone. Tambah atau muat template.
          </p>
        ) : (
          sorted.map((m, i) => (
            <MilestoneRow
              key={m.id}
              m={m}
              proyekId={proyek.id}
              isFirst={i === 0}
              isLast={i === sorted.length - 1}
              autoFocus={m.id === newId}
            />
          ))
        )}
      </div>

      {/* Template confirm dialog */}
      <AlertDialog open={templateConfirm} onOpenChange={setTemplateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Muat template milestone?</AlertDialogTitle>
            <AlertDialogDescription>
              Muat template dari &ldquo;{template?.templateName}&rdquo;? Milestone yang ada akan digantikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={replaceWithTemplate}>Muat Template</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 2: Add `replaceMilestonesWithTemplate` to the data layer**

In `src/lib/data/proyek.ts`, add this function at the end:

```ts
export async function replaceMilestonesWithTemplate(
  proyekId: string,
  templateMilestones: Omit<Milestone, "id" | "urutan">[],
): Promise<Proyek> {
  await delay(300);
  const idx = proyekFixtures.findIndex((p) => p.id === proyekId);
  if (idx === -1) throw new Error(`Proyek ${proyekId} not found`);
  const milestones: Milestone[] = templateMilestones.map((m, i) => ({
    ...m,
    id: `ML-${proyekId}-T${i + 1}`,
    urutan: i + 1,
  }));
  proyekFixtures[idx] = { ...proyekFixtures[idx], milestones };
  appendLog(proyekId, `Template milestone dimuat`);
  return proyekSchema.parse(proyekFixtures[idx]);
}
```

- [ ] **Step 3: Fix the `replaceWithTemplate` handler in MilestoneTab to use a proper hook**

The `replaceWithTemplate` function in `MilestoneTab` used a dynamic import — that's incorrect. Replace that function body with a proper implementation using a mutation hook. First, add a `useReplaceMilestonesWithTemplate` hook to `src/lib/query/proyek.ts`:

```ts
export function useReplaceMilestonesWithTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, templateMilestones }: {
      proyekId: string;
      templateMilestones: Omit<Milestone, "id" | "urutan">[];
    }) => replaceMilestonesWithTemplate(proyekId, templateMilestones),
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["proyek", proyekId] });
      qc.invalidateQueries({ queryKey: ["proyek-log", proyekId] });
    },
    onError: () => { toast.error("Gagal memuat template. Coba lagi."); },
  });
}
```

Add the import at the top of `src/lib/query/proyek.ts`:
```ts
import {
  // existing imports...
  replaceMilestonesWithTemplate,
} from "@/lib/data/proyek";
```

Now update `MilestoneTab` in `proyek-detail.tsx`:
- Add `useReplaceMilestonesWithTemplate` to the imports from `@/lib/query/proyek`
- In `MilestoneTab`, replace the `replaceWithTemplate` function and add the hook:

```tsx
function MilestoneTab({ proyek }: { proyek: Proyek }) {
  const addMilestone              = useAddMilestone();
  const replaceTemplate           = useReplaceMilestonesWithTemplate();
  const [newId, setNewId]         = React.useState<string | null>(null);
  const [templateConfirm, setTemplateConfirm] = React.useState(false);

  const sorted   = [...proyek.milestones].sort((a, b) => a.urutan - b.urutan);
  const template = getMilestoneTemplate(proyek.layananNama);

  const handleAddMilestone = () => {
    const id = `ML-${Date.now()}`;
    const maxUrutan = sorted.length > 0 ? Math.max(...sorted.map((m) => m.urutan)) : 0;
    addMilestone.mutate(
      {
        proyekId: proyek.id,
        milestone: {
          id, nama: "", urutan: maxUrutan + 1,
          assigneeNama: null, targetDate: null, actualDate: null,
          status: "belum_mulai", pemicuTermin: null,
        },
      },
      { onSuccess: () => setNewId(id) },
    );
  };

  const handleLoadTemplate = () => {
    if (!template) return;
    replaceTemplate.mutate(
      { proyekId: proyek.id, templateMilestones: template.milestones },
      { onSuccess: () => { toast.success("Template milestone dimuat."); setTemplateConfirm(false); } },
    );
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {template && (
            <Button variant="outline" size="sm" onClick={() => setTemplateConfirm(true)}>
              <LayoutList className="size-3.5 mr-1.5" /> Muat Template
            </Button>
          )}
        </div>
        <Button size="sm" onClick={handleAddMilestone} disabled={addMilestone.isPending}>
          <Plus className="size-3.5 mr-1.5" /> Tambah Milestone
        </Button>
      </div>

      {sorted.length > 0 && (
        <div
          className="grid items-center gap-2 px-2 pb-1 text-xs font-medium text-muted-foreground"
          style={{ gridTemplateColumns: "24px 1fr 130px 110px 110px 110px 80px 28px" }}
        >
          <span /><span>Nama</span><span>Assignee</span><span>Target</span>
          <span>Aktual</span><span>Status</span><span /><span />
        </div>
      )}

      <div className="rounded-lg border border-border">
        {sorted.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Belum ada milestone. Tambah atau muat template.
          </p>
        ) : (
          sorted.map((m, i) => (
            <MilestoneRow
              key={m.id}
              m={m}
              proyekId={proyek.id}
              isFirst={i === 0}
              isLast={i === sorted.length - 1}
              autoFocus={m.id === newId}
            />
          ))
        )}
      </div>

      <AlertDialog open={templateConfirm} onOpenChange={setTemplateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Muat template milestone?</AlertDialogTitle>
            <AlertDialogDescription>
              Muat template dari &ldquo;{template?.templateName}&rdquo;? Milestone yang ada akan digantikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={replaceTemplate.isPending}
              onClick={handleLoadTemplate}
            >
              Muat Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 4: Wire `MilestoneTab` into the detail component**

In `ProyekDetail`, replace the tab content placeholder:
```tsx
// Replace:
<TabsContent value="milestone">
  <p className="mt-4 text-sm text-muted-foreground">Milestone — segera hadir.</p>
</TabsContent>

// With:
<TabsContent value="milestone">
  <MilestoneTab proyek={proyek} />
</TabsContent>
```

- [ ] **Step 5: Run build — confirm exit 0**

```bash
npm run build
```

- [ ] **Step 6: Run tests — confirm all pass**

```bash
npm test
```

Expected: ~84 passing, 0 failing.

- [ ] **Step 7: Commit**

```bash
git add src/components/proyek/proyek-detail.tsx src/lib/data/proyek.ts src/lib/query/proyek.ts
git commit -m "feat(proyek): milestone tab — inline editing, template load, reorder, termin trigger"
```

---

## Task 8: Human Review Gate

- [ ] **Step 1:** Run `npm run dev`. Navigate to `/proyek` — confirm 4 rows, DataTable with correct columns, search works.

- [ ] **Step 2:** Navigate to `/penawaran`. For the `deal`-status SPH rows (SPH/001, SPH/002, SPH/004), open the row menu — confirm "Buat Proyek" item appears. Click it → confirm redirect to `/proyek/baru?sphId=SPH/001/5.2026` with pre-filled form. Create a project → confirm redirect to `/proyek/[id]`.

- [ ] **Step 3:** Navigate to `/proyek/PRJ-001`. Confirm:
  - Header: correct name, status badge "Penyusunan", perusahaan, assignee avatars
  - "Ubah Status" dropdown shows "Tunggu Pengesahan" and "Batalkan Proyek"
  - Milestone tab: 5 rows, inline editing works (edit Nama → click away → change persists after reload)
  - Milestone 3 shows no badge (status is on_track); if you change it to "Selesai" → "Tagih 30%" badge appears linking to `/faktur/INV%2F001%2F2026-T2`
  - Info Proyek tab: area, tahun, layanan badges, nilai kontrak, SPH link
  - Log Aktivitas tab: starts empty; after status change, log entry appears

- [ ] **Step 4:** Navigate to `/proyek/PRJ-003`. Confirm Milestone 3 already has "Tagih 40%" badge (status is selesai, pemicuTermin set). Click badge → navigates to `/faktur/INV%2F004%2F2026-T1`.

- [ ] **Step 5:** Test "Muat Template" on PRJ-001 (has Pertek Air Limbah layanan). Click → confirm dialog → confirm → 5 template milestones replace existing ones.

- [ ] **Step 6:** Kill the dev server. Address any visual issues before proceeding to Phase 3 next modules.

---

## Self-Review

**Spec coverage:**
- FR-04.1 (Project fields) → Task 1 schema + Task 4 list + Task 6 detail header ✓
- FR-04.2 (Configurable milestones) → Task 7 MilestoneRow (add/edit/delete/reorder) ✓
- FR-04.3 (Template milestones) → Task 2 `getMilestoneTemplate` + Task 7 "Muat Template" button ✓
- FR-04.6 (Status audit log) → Task 2 `appendLog` + Task 6 Log tab ✓
- FR-04.7 (Termin trigger suggestion) → Task 7 "Tagih X%" badge ✓
- FR-04.9 (Status workflow) → Task 2 `updateProyekStatus` + Task 6 header dropdown ✓
- Project creation from Deal SPH → Task 5 create page + Penawaran row menu ✓
- `getSph` note in spec → resolved: `getPenawaran` already exists, no new function needed ✓

**Out of scope (correctly absent):** Gantt, collaboration/comments, Realisasi RAB, Laporan Semester berulang, RBAC.
