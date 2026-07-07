import type { PengirimanLog } from "@/lib/schemas/pengiriman";
import { encodeSph, encodeInvTermin } from "@/lib/id-generator";
import { seedSphId } from "@/lib/penawaran-seed-ids";
import { perusahaanFixtures } from "@/lib/fixtures/perusahaan";
import { karyawanFixtures } from "@/lib/fixtures/karyawan";

let seq = 0;
export function nextPengirimanId(): string {
  return `KRM-${String(++seq).padStart(4, "0")}`;
}

const picMaju = perusahaanFixtures[0].pic[0]; // Andi Wijaya — PT Maju Bersama Industri
const picKaryaLogam = perusahaanFixtures[2].pic[0]; // Budi Santoso — PT Karya Logam Nusantara

// Penggajian is wired to the real backend now (payslips have no fixed mock
// id to reference) — this demo log entry just uses a plausible slip number.
const slipBudiId = "GAJ/001/4.2026";
const karyawanBudi = karyawanFixtures[0];

export const pengirimanFixtures: PengirimanLog[] = [
  {
    id: nextPengirimanId(),
    jenisDokumen: "sph",
    dokumenId: seedSphId(1),
    dokumenNomor: encodeSph(1, 5, 2026),
    tujuanNama: picMaju.nama,
    tujuanKontak: picMaju.telepon,
    channel: "whatsapp",
    timestamp: "2026-05-04T09:12:00.000Z",
  },
  {
    id: nextPengirimanId(),
    jenisDokumen: "faktur",
    dokumenId: encodeInvTermin(1, 2026, 0),
    dokumenNomor: encodeInvTermin(1, 2026, 0),
    tujuanNama: picMaju.nama,
    tujuanKontak: picMaju.telepon,
    channel: "whatsapp",
    timestamp: "2026-04-08T14:30:00.000Z",
  },
  {
    id: nextPengirimanId(),
    jenisDokumen: "faktur",
    dokumenId: encodeInvTermin(1, 2026, 1),
    dokumenNomor: encodeInvTermin(1, 2026, 1),
    tujuanNama: picMaju.nama,
    tujuanKontak: picMaju.telepon,
    channel: "whatsapp",
    timestamp: "2026-05-02T11:05:00.000Z",
  },
  {
    id: nextPengirimanId(),
    jenisDokumen: "slip",
    dokumenId: slipBudiId,
    dokumenNomor: slipBudiId,
    tujuanNama: karyawanBudi.nama,
    tujuanKontak: karyawanBudi.telepon ?? "",
    channel: "whatsapp",
    timestamp: "2026-04-25T16:45:00.000Z",
  },
  {
    id: nextPengirimanId(),
    jenisDokumen: "sph",
    dokumenId: seedSphId(2),
    dokumenNomor: encodeSph(2, 5, 2026),
    tujuanNama: picKaryaLogam.nama,
    tujuanKontak: picKaryaLogam.telepon,
    channel: "whatsapp",
    timestamp: "2026-05-12T10:20:00.000Z",
  },
];
