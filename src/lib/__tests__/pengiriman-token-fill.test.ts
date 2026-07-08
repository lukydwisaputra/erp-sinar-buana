import { describe, it, expect } from "vitest";
import { normalizePhone, buildWaLink, fillTokens } from "@/lib/pengiriman/token-fill";

describe("normalizePhone", () => {
  it("converts a leading 0 to the 62 country code", () => {
    expect(normalizePhone("081234567890")).toBe("6281234567890");
  });

  it("leaves an already-62-prefixed number untouched", () => {
    expect(normalizePhone("6281234567890")).toBe("6281234567890");
  });

  it("prefixes a bare number with 62", () => {
    expect(normalizePhone("81234567890")).toBe("6281234567890");
  });

  it("strips non-digit formatting", () => {
    expect(normalizePhone("0812-3456-7890")).toBe("6281234567890");
  });
});

describe("buildWaLink", () => {
  it("builds a wa.me link with the message URL-encoded", () => {
    const link = buildWaLink("081234567890", "Halo, ini pesan tes");
    expect(link).toBe("https://wa.me/6281234567890?text=Halo%2C%20ini%20pesan%20tes");
  });
});

describe("fillTokens", () => {
  it("fills every placeholder present in the token map", () => {
    const text = "Yth. {pic}, berikut Penawaran Harga {no_sph} dari {nama_perusahaan}.";
    const filled = fillTokens(text, { pic: "Budi", no_sph: "SPH/001/1.2026", nama_perusahaan: "PT Contoh" });
    expect(filled).toBe("Yth. Budi, berikut Penawaran Harga SPH/001/1.2026 dari PT Contoh.");
  });

  it("leaves unmatched placeholders untouched", () => {
    const filled = fillTokens("Halo {pic}, jatuh tempo {jatuh_tempo}.", { pic: "Budi" });
    expect(filled).toBe("Halo Budi, jatuh tempo {jatuh_tempo}.");
  });

  it("fills every real seeded template's placeholders with no leftover braces", () => {
    const templates: { text: string; tokens: Record<string, string> }[] = [
      {
        text: "Yth. {pic},\n\nBersama ini kami sampaikan Surat Penawaran Harga {no_sph}. Dokumen terlampir.\n\nHormat kami,\nPT SINAR BUANA MANDIRI JAYA",
        tokens: { pic: "Budi", no_sph: "SPH/001/1.2026" },
      },
      {
        text: "Yth. {pic},\n\nTerlampir Invoice {no_inv} dengan jatuh tempo {jatuh_tempo}.\n\nTerima kasih.",
        tokens: { pic: "Budi", no_inv: "INV/001/1.2026", jatuh_tempo: "14 Januari 2026" },
      },
      {
        text: "Yth. {nama_karyawan},\n\nTerlampir slip gaji periode {periode}.\n\nRahasia & hanya untuk Anda.",
        tokens: { nama_karyawan: "Siti", periode: "1 – 31 Januari 2026" },
      },
      {
        text: "Halo {pic}, terlampir Invoice {no_inv} (jatuh tempo {jatuh_tempo}). Terima kasih.",
        tokens: { pic: "Budi", no_inv: "INV/001/1.2026", jatuh_tempo: "14 Januari 2026" },
      },
      {
        text: "Halo {nama_karyawan}, terlampir slip gaji periode {periode}. Bersifat rahasia.",
        tokens: { nama_karyawan: "Siti", periode: "1 – 31 Januari 2026" },
      },
    ];
    for (const { text, tokens } of templates) {
      expect(fillTokens(text, tokens)).not.toMatch(/\{[a-z_]+\}/);
    }
  });
});
