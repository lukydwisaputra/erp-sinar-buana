import type { PenomoranConfig } from "@/lib/schemas/penomoran-config";

/** Plain zero-padded sequence format — matches the spec's own acceptance
 * criterion ("SPH/001/5.2026") literally. This is a deliberate departure from
 * today's Hashids-obfuscated fixture ids (e.g. "SPH/4w9z2/5.2026"); it does not
 * retrofit existing documents (BR-1: nomor tetap saat dokumen diedit). */
export const penomoranConfigFixture: { current: PenomoranConfig } = {
  current: {
    formats: [
      { docType: "sph", format: "SPH/{urut}/{bulan}.{tahun}" },
      { docType: "inv", format: "INV/{urut}/{tahun}" },
      { docType: "proyek", format: "PRJ/{urut}/{tahun}" },
    ],
  },
};
