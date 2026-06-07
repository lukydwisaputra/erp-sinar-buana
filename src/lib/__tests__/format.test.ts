import { describe, it, expect } from "vitest";
import { formatRupiah, parseRupiah } from "@/lib/format";

describe("formatRupiah", () => {
  it("formats with thousands separators and Rp prefix, no decimals", () => {
    expect(formatRupiah(1000000)).toBe("Rp 1.000.000");
  });
  it("formats zero", () => { expect(formatRupiah(0)).toBe("Rp 0"); });
  it("rounds to whole rupiah", () => { expect(formatRupiah(1500.7)).toBe("Rp 1.501"); });
  it("handles negatives", () => { expect(formatRupiah(-2500)).toBe("-Rp 2.500"); });
});

describe("parseRupiah", () => {
  it("parses a formatted string back to a number", () => {
    expect(parseRupiah("Rp 1.000.000")).toBe(1000000);
  });
  it("returns 0 for empty/garbage", () => { expect(parseRupiah("")).toBe(0); });
});
