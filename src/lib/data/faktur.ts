import { delay } from "@/lib/data/_delay";
import { fakturFixtures } from "@/lib/fixtures/faktur";
import { fakturSchema, type Faktur, type FakturStatus } from "@/lib/schemas/faktur";
import { sphIdToInvBase, terminFakturId } from "@/lib/faktur-id";
import { perusahaanFixtures } from "@/lib/fixtures/perusahaan";
import type { Sph } from "@/lib/schemas/penawaran";

export type ListFakturParams = { q?: string };

export async function listFaktur(params: ListFakturParams = {}): Promise<Faktur[]> {
  await delay();
  const rows = fakturSchema.array().parse(fakturFixtures);
  if (!params.q) return rows;
  const q = params.q.toLowerCase();
  return rows.filter(
    (r) => r.id.toLowerCase().includes(q) || r.perusahaanNama.toLowerCase().includes(q),
  );
}

export async function getFaktur(id: string): Promise<Faktur | null> {
  await delay(300);
  const row = fakturFixtures.find((r) => r.id === id);
  return row ? fakturSchema.parse(row) : null;
}

/**
 * Build all termin fakturs for a deal SPH and push them into the in-memory
 * store. Idempotent — skips any ID that already exists.
 */
export function createFakturSetFromSph(sph: Sph): void {
  const invBase = sphIdToInvBase(sph.id);
  const perusahaan = perusahaanFixtures.find((p) => p.id === sph.perusahaanId);
  const terminList = sph.termin.map((t) => ({
    label: t.label,
    persen: t.persen,
    pemicu: t.pemicu,
  }));

  for (let i = 0; i < sph.termin.length; i++) {
    const id = terminFakturId(invBase, i);
    if (fakturFixtures.some((f) => f.id === id)) continue;

    const faktur: Faktur = {
      id,
      sphId: sph.id,
      perusahaanId: sph.perusahaanId,
      perusahaanNama: sph.perusahaanNama,
      alamat: sph.alamat,
      kota: perusahaan?.kota ?? "",
      npwp: perusahaan?.npwp ?? "",
      items: sph.items.map((it) => ({
        uraian: it.nama,
        volume: it.volume,
        harga: it.harga,
        satuan: it.satuan,
      })),
      terminList,
      terminIndex: i,
      ppnAktif: sph.ppnAktif,
      ppnPersen: sph.ppnPersen,
      pph23Aktif: sph.pph23Aktif,
      pph23Persen: sph.pph23Persen,
      tanggal: "",
      jatuhTempo: "",
      status: "draft",
      catatan: [],
      tanggalBayar: "",
      bankNama: "",
      bankAtasNama: "",
      bankNoRekening: "",
      jabatanPenerima: "Direktur",
      picAktif: false,
      picNama: "",
      picJabatan: "",
    };

    fakturFixtures.push(faktur);
  }
}

export async function updateFakturStatus(id: string, newStatus: FakturStatus): Promise<void> {
  await delay(300);
  const idx = fakturFixtures.findIndex((f) => f.id === id);
  if (idx === -1) throw new Error(`Faktur ${id} not found`);
  fakturFixtures[idx] = { ...fakturFixtures[idx], status: newStatus };
}

export async function deleteAllFakturBySph(sphId: string): Promise<void> {
  await delay(300);
  for (let i = fakturFixtures.length - 1; i >= 0; i--) {
    if (fakturFixtures[i].sphId === sphId) fakturFixtures.splice(i, 1);
  }
}
