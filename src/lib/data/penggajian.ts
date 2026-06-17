import { delay } from "@/lib/data/_delay";
import { penggajianFixtures } from "@/lib/fixtures/penggajian";
import {
  penggajianBatchSchema, slipGajiSchema, calcSlip,
  type PenggajianBatch, type SlipGaji,
} from "@/lib/schemas/penggajian";

export type SlipEditFields = {
  tunjangan?: number;
  lembur?: number;
  bonus?: number;
  pph21?: number;
  bpjsPotongan?: number;
};

export type CreateBatchInput = {
  periode: { mulai: string; selesai: string };
  slips: Omit<SlipGaji, "id" | "batchId" | "status" | "paidAt">[];
};

export type ArusKasLogEntry = {
  id: string;
  slipId: string;
  batchId: string;
  karyawanNama: string;
  jumlah: number;
  timestamp: string;
  kategori: "penggajian";
};

const arusKasLog: ArusKasLogEntry[] = [];
let _arusKasId = 1;
let _batchSeq = 3;
let _slipSeq = 9;

function appendArusKas(slip: SlipGaji, batchId: string) {
  const { penggajianBersih } = calcSlip(slip);
  arusKasLog.push({
    id: `AKS-${String(_arusKasId++).padStart(4, "0")}`,
    slipId: slip.id,
    batchId,
    karyawanNama: slip.karyawanNama,
    jumlah: penggajianBersih,
    timestamp: new Date().toISOString(),
    kategori: "penggajian",
  });
}

export async function listBatch(): Promise<PenggajianBatch[]> {
  await delay();
  return penggajianBatchSchema.array().parse(penggajianFixtures);
}

export async function getBatch(id: string): Promise<PenggajianBatch | null> {
  await delay(300);
  const b = penggajianFixtures.find((b) => b.id === id);
  return b ? penggajianBatchSchema.parse(b) : null;
}

export async function getSlip(batchId: string, slipId: string): Promise<SlipGaji | null> {
  await delay(200);
  const b = penggajianFixtures.find((b) => b.id === batchId);
  if (!b) return null;
  const s = b.slips.find((s) => s.id === slipId);
  return s ? slipGajiSchema.parse(s) : null;
}

export async function createBatch(input: CreateBatchInput): Promise<PenggajianBatch> {
  await delay(400);
  const batchId = `GAJ-${String(_batchSeq++).padStart(3, "0")}`;
  const slips: SlipGaji[] = input.slips.map((s) => ({
    ...s,
    id: `SLP-${String(_slipSeq++).padStart(3, "0")}`,
    batchId,
    status: "menunggu_pembayaran" as const,
    paidAt: null,
  }));
  const batch: PenggajianBatch = {
    id: batchId,
    periode: input.periode,
    slips,
    createdAt: new Date().toISOString(),
  };
  penggajianFixtures.push(penggajianBatchSchema.parse(batch));
  return penggajianBatchSchema.parse(penggajianFixtures[penggajianFixtures.length - 1]);
}

export async function updateSlip(
  batchId: string,
  slipId: string,
  patch: SlipEditFields,
): Promise<SlipGaji> {
  await delay(200);
  const bIdx = penggajianFixtures.findIndex((b) => b.id === batchId);
  if (bIdx === -1) throw new Error(`Batch ${batchId} not found`);
  const sIdx = penggajianFixtures[bIdx].slips.findIndex((s) => s.id === slipId);
  if (sIdx === -1) throw new Error(`Slip ${slipId} not found`);
  const current = penggajianFixtures[bIdx].slips[sIdx];
  if (current.status === "sudah_dibayar") throw new Error("Slip sudah dibayar, tidak dapat diubah.");
  const updated = { ...current, ...patch };
  const slips = [...penggajianFixtures[bIdx].slips];
  slips[sIdx] = updated;
  penggajianFixtures[bIdx] = { ...penggajianFixtures[bIdx], slips };
  return slipGajiSchema.parse(updated);
}

export async function markSlipDibayar(batchId: string, slipId: string): Promise<SlipGaji> {
  await delay(300);
  const bIdx = penggajianFixtures.findIndex((b) => b.id === batchId);
  if (bIdx === -1) throw new Error(`Batch ${batchId} not found`);
  const sIdx = penggajianFixtures[bIdx].slips.findIndex((s) => s.id === slipId);
  if (sIdx === -1) throw new Error(`Slip ${slipId} not found`);
  const current = penggajianFixtures[bIdx].slips[sIdx];
  if (current.status === "sudah_dibayar") throw new Error("Slip sudah dibayar.");
  const updated: SlipGaji = { ...current, status: "sudah_dibayar", paidAt: new Date().toISOString() };
  const slips = [...penggajianFixtures[bIdx].slips];
  slips[sIdx] = updated;
  penggajianFixtures[bIdx] = { ...penggajianFixtures[bIdx], slips };
  appendArusKas(updated, batchId);
  return slipGajiSchema.parse(updated);
}

export async function listArusKasLog(): Promise<ArusKasLogEntry[]> {
  await delay(100);
  return [...arusKasLog];
}
