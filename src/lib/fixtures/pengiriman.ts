import type { PengirimanLog } from "@/lib/schemas/pengiriman";
import { encodeSph, encodeInvTermin } from "@/lib/id-generator";
import { perusahaanFixtures } from "@/lib/fixtures/perusahaan";
import { penggajianFixtures } from "@/lib/fixtures/penggajian";
import { karyawanFixtures } from "@/lib/fixtures/karyawan";

let seq = 0;
export function nextPengirimanId(): string {
  return `KRM-${String(++seq).padStart(4, "0")}`;
}

const picMaju = perusahaanFixtures[0].pic[0]; // Andi Wijaya — PT Maju Bersama Industri
const picKaryaLogam = perusahaanFixtures[2].pic[0]; // Budi Santoso — PT Karya Logam Nusantara

const slipBudi = penggajianFixtures[0].slips.find((s) => s.karyawanId === karyawanFixtures[0].id)!;
const karyawanBudi = karyawanFixtures[0];

export const pengirimanFixtures: PengirimanLog[] = [
  {
    id: nextPengirimanId(),
    jenisDokumen: "sph",
    dokumenId: encodeSph(1, 5, 2026),
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
    dokumenId: slipBudi.id,
    dokumenNomor: slipBudi.id,
    tujuanNama: karyawanBudi.nama,
    tujuanKontak: karyawanBudi.telepon ?? "",
    channel: "whatsapp",
    timestamp: "2026-04-25T16:45:00.000Z",
  },
  {
    id: nextPengirimanId(),
    jenisDokumen: "sph",
    dokumenId: encodeSph(2, 5, 2026),
    dokumenNomor: encodeSph(2, 5, 2026),
    tujuanNama: picKaryaLogam.nama,
    tujuanKontak: picKaryaLogam.telepon,
    channel: "whatsapp",
    timestamp: "2026-05-12T10:20:00.000Z",
  },
];
