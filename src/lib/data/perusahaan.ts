import { delay } from "@/lib/data/_delay";
import { perusahaanFixtures } from "@/lib/fixtures/perusahaan";
import { penawaranFixtures } from "@/lib/fixtures/penawaran";
import { proyekFixtures } from "@/lib/fixtures/proyek";
import { fakturFixtures } from "@/lib/fixtures/faktur";
import { perusahaanSchema, type Perusahaan } from "@/lib/schemas/perusahaan";

const ACTIVE_STATUSES = new Set(["on_track", "terlambat", "belum_mulai"]);

function computeMetrik(id: string): Perusahaan["metrik"] {
  const jumlahPenawaran = penawaranFixtures.filter((s) => s.perusahaanId === id).length;

  const proyekPerusahaan = proyekFixtures.filter((p) => p.perusahaanId === id);
  const proyekAktif = proyekPerusahaan.filter((p) => ACTIVE_STATUSES.has(p.status)).length;
  const nilaiKontrak = proyekPerusahaan.reduce((s, p) => s + p.nilaiKontrak, 0);

  const piutang = fakturFixtures
    .filter((f) => f.perusahaanId === id && f.status === "terkirim")
    .reduce((sum, f) => {
      const subtotal = f.items.reduce((s, it) => s + it.volume * it.harga, 0);
      const termin = f.terminList[f.terminIndex];
      if (!termin) return sum;
      const nilaiTermin = (termin.persen / 100) * subtotal;
      const dpp = (11 / 12) * nilaiTermin;
      const ppn = f.ppnAktif ? Math.round((f.ppnPersen / 100) * dpp) : 0;
      const pph23 = f.pph23Aktif ? (f.pph23Persen / 100) * nilaiTermin : 0;
      return sum + nilaiTermin + ppn - pph23;
    }, 0);

  return { jumlahPenawaran, proyekAktif, nilaiKontrak, piutang };
}

function withMetrik(raw: (typeof perusahaanFixtures)[number]): Perusahaan {
  return perusahaanSchema.parse({ ...raw, metrik: computeMetrik(raw.id) });
}

export type ListPerusahaanParams = { q?: string };

export async function listPerusahaan(params: ListPerusahaanParams = {}): Promise<Perusahaan[]> {
  await delay();
  const rows = perusahaanFixtures.map(withMetrik);
  if (!params.q) return rows;
  const q = params.q.toLowerCase();
  return rows.filter(
    (r) =>
      r.nama.toLowerCase().includes(q) ||
      r.pic.some((p) => p.nama.toLowerCase().includes(q)),
  );
}

export async function getPerusahaan(id: string): Promise<Perusahaan | null> {
  await delay(300);
  const row = perusahaanFixtures.find((r) => r.id === id);
  return row ? withMetrik(row) : null;
}

export type UpdatePerusahaanInput = Partial<Omit<Perusahaan, "id" | "metrik">>;

export async function updatePerusahaan(id: string, input: UpdatePerusahaanInput): Promise<Perusahaan> {
  await delay(300);
  const idx = perusahaanFixtures.findIndex((r) => r.id === id);
  if (idx === -1) throw new Error(`Perusahaan ${id} tidak ditemukan`);
  perusahaanFixtures[idx] = { ...perusahaanFixtures[idx], ...input };
  return withMetrik(perusahaanFixtures[idx]);
}

export async function deletePerusahaan(id: string): Promise<void> {
  await delay(200);
  const idx = perusahaanFixtures.findIndex((r) => r.id === id);
  if (idx !== -1) perusahaanFixtures.splice(idx, 1);
}
