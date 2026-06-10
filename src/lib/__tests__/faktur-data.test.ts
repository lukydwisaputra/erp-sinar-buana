import { describe, it, expect } from "vitest";
import { listFaktur, getFaktur, updateFakturStatus, deleteAllFakturBySph } from "@/lib/data/faktur";

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

describe("updateFakturStatus", () => {
  it("changes a faktur status in the store", async () => {
    await updateFakturStatus("INV/001/2026-T2", "dibatalkan");
    const f = await getFaktur("INV/001/2026-T2");
    expect(f?.status).toBe("dibatalkan");
  });

  it("throws for unknown id", async () => {
    await expect(updateFakturStatus("INV/999/0000-T9", "dibatalkan")).rejects.toThrow();
  });
});

describe("deleteAllFakturBySph", () => {
  it("removes all fakturs linked to an sphId", async () => {
    const sphId = "SPH/002/5.2026";
    const before = await listFaktur();
    const linked = before.filter((f) => f.sphId === sphId);
    expect(linked.length).toBeGreaterThanOrEqual(1);
    await deleteAllFakturBySph(sphId);
    const after = await listFaktur();
    expect(after.filter((f) => f.sphId === sphId).length).toBe(0);
  });
});
