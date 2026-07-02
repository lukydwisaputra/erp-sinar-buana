import type { ArusKasEntry } from "@/lib/schemas/arus-kas";

let seq = 0;
function nextId(): string {
  return `AKS-${String(++seq).padStart(4, "0")}`;
}

export function bumpSeq(): number { return ++seq; }

const manualEntries: ArusKasEntry[] = [
  {
    id: nextId(), jenis: "debit", tanggal: "2026-04-05", jumlah: 8_500_000,
    kategori: "Sewa Kantor", sumber: "manual",
    keterangan: "Sewa kantor bulan April", locked: false,
  },
  {
    id: nextId(), jenis: "debit", tanggal: "2026-04-10", jumlah: 2_750_000,
    kategori: "Utilitas", sumber: "manual",
    keterangan: "Listrik & internet bulan April", locked: false,
  },
  {
    id: nextId(), jenis: "debit", tanggal: "2026-04-18", jumlah: 1_200_000,
    kategori: "Transport", sumber: "manual",
    keterangan: "Transport operasional", locked: false,
  },
  {
    id: nextId(), jenis: "debit", tanggal: "2026-05-03", jumlah: 850_000,
    kategori: "ATK", sumber: "manual",
    keterangan: "ATK & perlengkapan kantor", locked: false,
  },
  {
    id: nextId(), jenis: "debit", tanggal: "2026-05-12", jumlah: 3_500_000,
    kategori: "Administrasi", sumber: "manual",
    keterangan: "Biaya notaris akta perusahaan", locked: false,
  },
  {
    id: nextId(), jenis: "kredit", tanggal: "2026-05-20", jumlah: 5_000_000,
    kategori: "Deposit", sumber: "manual",
    keterangan: "Pengembalian deposit sewa alat", locked: false,
  },
];

/** The manual seed rows. Automated rows (from already-lunas/already-dibayar
 * fixture data) are appended by src/lib/data/arus-kas-automation.ts, which
 * imports this array — kept out of this file so it has no dependency on
 * fakturFixtures/penggajianFixtures or the automation module (avoids a
 * require-cycle; every data-layer module that needs the automated rows to
 * already be seeded imports arus-kas-automation.ts). */
export const arusKasFixtures: ArusKasEntry[] = [...manualEntries];
