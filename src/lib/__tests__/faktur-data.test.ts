import { describe, it, expect } from "vitest";
import { listFaktur, getFaktur } from "@/lib/data/faktur";

describe("faktur data", () => {
  it("parses all fixtures", async () => {
    const rows = await listFaktur();
    expect(rows.length).toBeGreaterThanOrEqual(7);
  });
  it("gets one by new ID format", async () => {
    const f = await getFaktur("INV/001/2026-T2");
    expect(f?.perusahaanNama).toContain("PT");
  });
  it("returns null for unknown id", async () => {
    const f = await getFaktur("INV/999/2099-T9");
    expect(f).toBeNull();
  });
});
