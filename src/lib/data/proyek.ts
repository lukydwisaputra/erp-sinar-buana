import { delay } from "@/lib/data/_delay";
import { proyekFixtures } from "@/lib/fixtures/proyek";
import { proyekSchema, type Proyek, type ProyekStatus, type Milestone } from "@/lib/schemas/proyek";
import { afterTaxAmount } from "@/lib/faktur";
import { proyekHashids } from "@/lib/id-generator";
import type { Sph } from "@/lib/schemas/penawaran";

export type ListProyekParams = { q?: string };

export type ProyekCreateInput = Omit<Proyek, "id" | "milestones" | "createdAt" | "status">;

export type ProyekLogEntry = {
  id: string;
  proyekId: string;
  milestoneId: string | null;
  timestamp: string;
  description: string;
};

export type MilestoneAttachment = { name: string; url: string; type?: string };

export type MilestoneComment = {
  id: string;
  proyekId: string;
  milestoneId: string;
  author: string;
  content: string;
  attachments: MilestoneAttachment[];
  timestamp: string;
};

const logStore: ProyekLogEntry[] = [];
const commentStore: MilestoneComment[] = [];
let _logId = 1;
let _commentId = 1;
let _proyekSeq = 4;

function appendLog(proyekId: string, description: string, milestoneId: string | null = null) {
  logStore.push({
    id: `LOG-${String(_logId++).padStart(4, "0")}`,
    proyekId,
    milestoneId,
    timestamp: new Date().toISOString(),
    description,
  });
}

export function createProyekFromSph(sph: Sph): void {
  if (proyekFixtures.some((p) => p.sphId === sph.id)) return;
  const year = new Date().getFullYear();
  const sphHash = sph.id.split("/")[1];
  const id = `PRJ/${sphHash}/${year}`;
  const totalBiaya = sph.items.reduce(
    (sum, it) => sum + (Number(it.volume) || 0) * (Number(it.harga) || 0),
    0,
  );
  const nilaiKontrak = afterTaxAmount(
    totalBiaya, sph.ppnAktif, sph.ppnPersen, sph.pph23Aktif, sph.pph23Persen,
  );
  const proyek: Proyek = {
    id,
    nama: `Proyek — ${sph.perusahaanNama}`,
    perusahaanId: sph.perusahaanId,
    perusahaanNama: sph.perusahaanNama,
    area: "",
    tahun: year,
    layananNama: sph.items.map((it) => it.nama),
    status: "belum_mulai",
    nilaiKontrak,
    sphId: sph.id,
    assignees: [],
    milestones: [],
    createdAt: new Date().toISOString(),
  };
  proyekFixtures.push(proyekSchema.parse(proyek));
  appendLog(id, "Proyek dibuat otomatis dari SPH");
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
  const year = new Date().getFullYear();
  const id = `PRJ/${proyekHashids.encode(_proyekSeq++)}/${year}`;
  const proyek: Proyek = {
    ...input,
    id,
    status: "belum_mulai",
    milestones: [],
    createdAt: new Date().toISOString(),
  };
  proyekFixtures.push(proyekSchema.parse(proyek));
  appendLog(id, `Proyek dibuat`);
  return proyekSchema.parse(proyekFixtures[proyekFixtures.length - 1]);
}

export async function updateProyekAssignees(
  id: string,
  assignees: Proyek["assignees"],
): Promise<Proyek> {
  await delay(200);
  const idx = proyekFixtures.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Proyek ${id} not found`);
  proyekFixtures[idx] = { ...proyekFixtures[idx], assignees };
  return proyekSchema.parse(proyekFixtures[idx]);
}

export async function updateProyekStatus(id: string, status: ProyekStatus): Promise<Proyek> {
  await delay(300);
  const idx = proyekFixtures.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error(`Proyek ${id} not found`);
  const old = proyekFixtures[idx];
  const STATUS_LABELS: Record<ProyekStatus, string> = {
    belum_mulai: "Belum Mulai", on_track: "Sedang Berjalan",
    terlambat: "Terlambat", selesai: "Selesai", dibatalkan: "Dibatalkan",
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

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
  };

  if (patch.status && patch.status !== oldMilestone.status) {
    const LABELS: Record<string, string> = {
      belum_mulai: "Belum Mulai", on_track: "Sedang Berjalan",
      terlambat: "Terlambat", selesai: "Selesai",
    };
    appendLog(proyekId, `Status: ${LABELS[oldMilestone.status]} → ${LABELS[updated.status]}`, milestoneId);
  }
  if (patch.nama !== undefined && patch.nama !== oldMilestone.nama) {
    appendLog(proyekId, `Nama: "${oldMilestone.nama}" → "${patch.nama}"`, milestoneId);
  }
  if ("description" in patch && patch.description !== oldMilestone.description) {
    appendLog(proyekId, "Deskripsi diperbarui", milestoneId);
  }
  if ("assignees" in patch) {
    const oldNames = oldMilestone.assignees.map((a) => a.nama).join(", ") || "—";
    const newNames = (patch.assignees ?? []).map((a) => a.nama).join(", ") || "—";
    if (oldNames !== newNames)
      appendLog(proyekId, `Assignee: ${oldNames} → ${newNames}`, milestoneId);
  }
  if ("targetDate" in patch && patch.targetDate !== oldMilestone.targetDate) {
    appendLog(proyekId, `Target: ${fmtDate(oldMilestone.targetDate)} → ${fmtDate(patch.targetDate)}`, milestoneId);
  }
  if ("actualDate" in patch && patch.actualDate !== oldMilestone.actualDate) {
    appendLog(proyekId, `Aktual: ${fmtDate(oldMilestone.actualDate)} → ${fmtDate(patch.actualDate)}`, milestoneId);
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
  const target = proyek.milestones.find((m) => m.id === milestoneId);
  if (!target) return proyekSchema.parse(proyek);
  const siblings = [...proyek.milestones]
    .filter((m) => (m.parentId ?? null) === (target.parentId ?? null))
    .sort((a, b) => a.urutan - b.urutan);
  const sibIdx = siblings.findIndex((m) => m.id === milestoneId);
  const swapIdx = direction === "up" ? sibIdx - 1 : sibIdx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return proyekSchema.parse(proyek);
  const tempUrutan = siblings[sibIdx].urutan;
  siblings[sibIdx] = { ...siblings[sibIdx], urutan: siblings[swapIdx].urutan };
  siblings[swapIdx] = { ...siblings[swapIdx], urutan: tempUrutan };
  const sibMap = new Map(siblings.map((m) => [m.id, m]));
  const milestones = proyek.milestones.map((m) => sibMap.get(m.id) ?? m);
  proyekFixtures[idx] = { ...proyek, milestones };
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
  const toRemove = new Set<string>();
  const collectDescendants = (id: string) => {
    toRemove.add(id);
    proyek.milestones.filter((m) => m.parentId === id).forEach((c) => collectDescendants(c.id));
  };
  collectDescendants(milestoneId);
  const remaining = proyek.milestones.filter((m) => !toRemove.has(m.id));
  const byParent = new Map<string | null, Milestone[]>();
  for (const m of remaining) {
    const key = m.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(m);
  }
  const reindexed: Milestone[] = [];
  for (const [, group] of byParent) {
    const sorted = [...group].sort((a, b) => a.urutan - b.urutan);
    sorted.forEach((m, i) => reindexed.push({ ...m, urutan: i + 1 }));
  }
  proyekFixtures[idx] = { ...proyek, milestones: reindexed };
  return proyekSchema.parse(proyekFixtures[idx]);
}

export async function cancelProyekBySph(sphId: string): Promise<void> {
  const proyek = proyekFixtures.find((p) => p.sphId === sphId);
  if (!proyek) return;
  await updateProyekStatus(proyek.id, "dibatalkan");
}

export async function deleteProyekBySph(sphId: string): Promise<void> {
  await delay(100);
  const idx = proyekFixtures.findIndex((p) => p.sphId === sphId);
  if (idx !== -1) proyekFixtures.splice(idx, 1);
}

export async function listProyekLog(proyekId: string): Promise<ProyekLogEntry[]> {
  await delay(200);
  return logStore.filter((e) => e.proyekId === proyekId);
}

export async function listMilestoneLog(proyekId: string, milestoneId: string): Promise<ProyekLogEntry[]> {
  await delay(100);
  return logStore.filter((e) => e.proyekId === proyekId && e.milestoneId === milestoneId);
}

export async function listMilestoneComments(proyekId: string, milestoneId: string): Promise<MilestoneComment[]> {
  await delay(100);
  return commentStore.filter((c) => c.proyekId === proyekId && c.milestoneId === milestoneId);
}

export async function logMilestoneActivity(proyekId: string, milestoneId: string, message: string): Promise<void> {
  appendLog(proyekId, message, milestoneId);
}

export async function addMilestoneComment(
  proyekId: string,
  milestoneId: string,
  input: { author: string; content: string; attachments: MilestoneAttachment[] },
): Promise<MilestoneComment> {
  await delay(200);
  const comment: MilestoneComment = {
    id: `CMT-${String(_commentId++).padStart(4, "0")}`,
    proyekId,
    milestoneId,
    ...input,
    timestamp: new Date().toISOString(),
  };
  commentStore.push(comment);
  return comment;
}
