import type { KewajibanPajak } from "@/lib/schemas/kewajiban-pajak";

let seq = 0;
function nextId(): string {
  return `KWP-${String(++seq).padStart(4, "0")}`;
}

export function bumpSeq(): number {
  return ++seq;
}

export const kewajibanPajakFixtures: KewajibanPajak[] = [
  {
    id: nextId(), jenis: "ppn", periode: "2026-05", jumlah: 12_500_000,
    jatuhTempo: "2026-06-15", status: "belum_setor", buktiPotongDiterima: true,
    keterangan: "PPN Masa Mei 2026 — terlambat",
  },
  {
    id: nextId(), jenis: "pph21", periode: "2026-05", jumlah: 4_200_000,
    jatuhTempo: "2026-06-10", status: "disetor", buktiPotongDiterima: true,
    keterangan: "PPh 21 Masa Mei 2026",
  },
  {
    id: nextId(), jenis: "bpjs", periode: "2026-06", jumlah: 3_800_000,
    jatuhTempo: "2026-06-24", status: "belum_setor", buktiPotongDiterima: true,
    keterangan: "BPJS Juni 2026 — jatuh tempo H-2",
  },
  {
    id: nextId(), jenis: "pph23", periode: "2026-05", jumlah: 2_000_000,
    jatuhTempo: "2026-06-20", status: "belum_setor", buktiPotongDiterima: false,
    keterangan: "PPh 23 dipotong klien — bukti potong belum diterima",
  },
  {
    id: nextId(), jenis: "ppn", periode: "2026-06", jumlah: 9_750_000,
    jatuhTempo: "2026-07-15", status: "belum_setor", buktiPotongDiterima: true,
    keterangan: "PPN Masa Juni 2026 — mendatang",
  },
];
