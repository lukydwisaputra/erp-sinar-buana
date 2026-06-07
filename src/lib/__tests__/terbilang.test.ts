import { describe, it, expect } from "vitest";
import { terbilang } from "@/lib/terbilang";

describe("terbilang", () => {
  it("handles zero", () => { expect(terbilang(0)).toBe("nol"); });
  it("handles units", () => { expect(terbilang(7)).toBe("tujuh"); });
  it("handles 'belas'", () => { expect(terbilang(12)).toBe("dua belas"); });
  it("handles 'puluh'", () => { expect(terbilang(25)).toBe("dua puluh lima"); });
  it("uses 'seratus' / 'seribu' special cases", () => {
    expect(terbilang(100)).toBe("seratus");
    expect(terbilang(1000)).toBe("seribu");
  });
  it("handles ratus + ribu", () => {
    expect(terbilang(1500)).toBe("seribu lima ratus");
    expect(terbilang(2750)).toBe("dua ribu tujuh ratus lima puluh");
  });
  it("handles juta", () => {
    expect(terbilang(1000000)).toBe("satu juta");
    expect(terbilang(1250000)).toBe("satu juta dua ratus lima puluh ribu");
  });
});
