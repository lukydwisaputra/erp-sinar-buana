import { describe, it, expect } from "vitest";
import { normalizePhone, buildWaLink, buildPesanWa } from "@/lib/pengiriman-templates";

describe("normalizePhone", () => {
  it("converts leading 0 to country code 62", () => {
    expect(normalizePhone("0812-1100-2201")).toBe("6281211002201");
  });
  it("leaves an already-normalized number untouched", () => {
    expect(normalizePhone("6281211002201")).toBe("6281211002201");
  });
});

describe("buildPesanWa", () => {
  it("fills SPH placeholders", () => {
    const msg = buildPesanWa("sph", { perusahaan: "PT Maju Bersama", nomor: "SPH/001/1.2026" });
    expect(msg).toContain("PT Maju Bersama");
    expect(msg).toContain("SPH/001/1.2026");
    expect(msg).not.toContain("{");
  });
  it("fills Invoice placeholders", () => {
    const msg = buildPesanWa("faktur", { perusahaan: "PT Maju Bersama", nomor: "INV/002/05.2026" });
    expect(msg).toContain("INV/002/05.2026");
  });
  it("fills Slip placeholders with employee name, not company", () => {
    const msg = buildPesanWa("slip", { perusahaan: "Budi Santoso", nomor: "SLIP-0004-2026-06" });
    expect(msg).toContain("Budi Santoso");
  });
});

describe("buildWaLink", () => {
  it("builds a wa.me URL with the message URI-encoded", () => {
    const link = buildWaLink("0812-1100-2201", "Halo Andi");
    expect(link).toBe("https://wa.me/6281211002201?text=Halo%20Andi");
  });
});
