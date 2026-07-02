import type { PengirimanConfig } from "@/lib/schemas/pengiriman-config";

/** Mutable singleton holder so updates persist within the session. */
export const pengirimanConfigFixture: { current: PengirimanConfig } = {
  current: {
    emailAkun: null, // matches today's `emailTerkonfigurasi: false` default exactly — no behavior change on first load
    emailTemplates: {
      sph: {
        subjek: "Surat Penawaran Harga {nomor} — {perusahaan}",
        body: "Yth. {perusahaan},\n\nBerikut kami sampaikan Surat Penawaran Harga No. {nomor}. PDF terlampir.\n\nTerima kasih.",
      },
      faktur: {
        subjek: "Invoice {nomor} — {perusahaan}",
        body: "Yth. {perusahaan},\n\nBerikut kami sampaikan Invoice No. {nomor}. PDF terlampir.\n\nTerima kasih.",
      },
      slip: {
        subjek: "Slip Gaji {nomor}",
        body: "Yth. {perusahaan},\n\nBerikut slip gaji Anda No. {nomor}. PDF terlampir.\n\nTerima kasih.",
      },
    },
  },
};
