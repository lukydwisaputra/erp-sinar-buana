import { describe, it, expect } from "vitest";
import { formatRupiah, formatRupiahCompact, parseRupiah } from "@/lib/format";

describe("formatRupiah", () => {
  it("formats with thousands separators and Rp prefix, no decimals", () => {
    expect(formatRupiah(1000000)).toBe("Rp 1.000.000");
  });
  it("formats zero", () => { expect(formatRupiah(0)).toBe("Rp 0"); });
  it("rounds to whole rupiah", () => { expect(formatRupiah(1500.7)).toBe("Rp 1.501"); });
  it("handles negatives", () => { expect(formatRupiah(-2500)).toBe("-Rp 2.500"); });
});

describe("formatRupiahCompact", () => {
  it("keeps billions on one line with M suffix", () => {
    expect(formatRupiahCompact(1_250_000_000)).toBe("Rp 1,25 M");
  });
  it("uses jt for millions, trimming trailing zeros", () => {
    expect(formatRupiahCompact(145_000_000)).toBe("Rp 145 jt");
  });
  it("uses rb for thousands", () => {
    expect(formatRupiahCompact(52_000)).toBe("Rp 52 rb");
  });
  it("uses T for trillions", () => {
    expect(formatRupiahCompact(2_400_000_000_000)).toBe("Rp 2,4 T");
  });
  it("formats zero plainly", () => { expect(formatRupiahCompact(0)).toBe("Rp 0"); });
});

describe("parseRupiah", () => {
  it("parses a formatted string back to a number", () => {
    expect(parseRupiah("Rp 1.000.000")).toBe(1000000);
  });
  it("returns 0 for empty/garbage", () => { expect(parseRupiah("")).toBe(0); });
});
