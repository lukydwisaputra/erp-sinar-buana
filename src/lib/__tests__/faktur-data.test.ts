import { describe, it, expect } from "vitest";
import { listFaktur, getFaktur, updateFakturStatus, deleteAllFakturBySph } from "@/lib/data/faktur";
import { encodeInvTermin, encodeSph } from "@/lib/id-generator";

const INV1T2 = encodeInvTermin(1, 2026, 1);
const SPH2 = encodeSph(2, 5, 2026);

describe("faktur data", () => {
  it("parses all fixtures", async () => {
    const rows = await listFaktur();
    expect(rows.length).toBeGreaterThanOrEqual(7);
  });
  it("gets one by new ID format", async () => {
    const f = await getFaktur(INV1T2);
    expect(f?.perusahaanNama).toContain("PT");
  });
  it("returns null for unknown id", async () => {
    const f = await getFaktur("INV/NOPE/2099-T9");
    expect(f).toBeNull();
  });
});

describe("updateFakturStatus", () => {
  it("changes a faktur status in the store", async () => {
    await updateFakturStatus(INV1T2, "dibatalkan");
    const f = await getFaktur(INV1T2);
    expect(f?.status).toBe("dibatalkan");
  });

  it("throws for unknown id", async () => {
    await expect(updateFakturStatus("INV/NOPE/0000-T9", "dibatalkan")).rejects.toThrow();
  });
});

describe("deleteAllFakturBySph", () => {
  it("removes all fakturs linked to an sphId", async () => {
    const before = await listFaktur();
    const linked = before.filter((f) => f.sphId === SPH2);
    expect(linked.length).toBeGreaterThanOrEqual(1);
    await deleteAllFakturBySph(SPH2);
    const after = await listFaktur();
    expect(after.filter((f) => f.sphId === SPH2).length).toBe(0);
  });
});
