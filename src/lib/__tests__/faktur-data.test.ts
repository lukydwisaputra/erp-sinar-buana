import { describe, it, expect } from "vitest";
import { listFaktur, getFaktur } from "@/lib/data/faktur";

describe("faktur data", () => {
  it("parses all fixtures", async () => {
    const rows = await listFaktur();
    expect(rows.length).toBeGreaterThanOrEqual(5);
  });
  it("gets one by id", async () => {
    const f = await getFaktur("INV/002/05.2026");
    expect(f?.perusahaanNama).toContain("PT");
  });
});
