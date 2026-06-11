import { delay } from "@/lib/data/_delay";
import { proyekFixtures } from "@/lib/fixtures/proyek";
import { proyekSchema, type Proyek, type ProyekStatus, type Milestone } from "@/lib/schemas/proyek";
import { katalogFixtures } from "@/lib/fixtures/katalog";

export type ListProyekParams = { q?: string };

export type ProyekCreateInput = Omit<Proyek, "id" | "milestones" | "createdAt" | "status"> & {
  status?: ProyekStatus;
};

export type ProyekLogEntry = {
  id: string;
  proyekId: string;
  timestamp: string;
  description: string;
};

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
    status: "po_kontrak",
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
  appendLog(id, `Status diubah: ${STATUS_LABELS[old.status]} (${old.status}) → ${STATUS_LABELS[status]} (${status})`);
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
