import { describe, it, expect } from "vitest";
import { listFaktur, getFaktur, updateFaktur, updateFakturStatus, deleteAllFakturBySph } from "@/lib/data/faktur";
import { listArusKas } from "@/lib/data/arus-kas";
import { updateStatusLabel } from "@/lib/data/status-definisi";
import { encodeInvTermin } from "@/lib/id-generator";
import { seedSphId } from "@/lib/penawaran-seed-ids";

const INV1T2 = encodeInvTermin(1, 2026, 1);
const SPH2 = seedSphId(2);

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

describe("Arus Kas automation on Faktur status change (regression)", () => {
  it("posts an otomatis_faktur entry when a faktur is marked lunas via updateFaktur", async () => {
    const target = encodeInvTermin(1, 2026, 2);
    const before = await listArusKas();
    expect(before.filter((e) => e.referensiId === target).length).toBe(0);
    await updateFaktur(target, { status: "lunas", tanggalBayar: "2026-07-01" });
    const after = await listArusKas();
    const posted = after.filter((e) => e.referensiId === target && e.sumber === "otomatis_faktur");
    expect(posted.length).toBeGreaterThan(0);
  });

  it("does not double-post on a second save with the same status", async () => {
    const target = encodeInvTermin(1, 2026, 2); // already lunas from the previous test
    const before = (await listArusKas()).filter((e) => e.referensiId === target).length;
    await updateFaktur(target, { status: "lunas" });
    const after = (await listArusKas()).filter((e) => e.referensiId === target).length;
    expect(after).toBe(before);
  });

  it("posts nothing when a never-lunas faktur is cancelled", async () => {
    const target = encodeInvTermin(4, 2026, 0); // seeded "terkirim", never lunas
    const before = await listArusKas();
    await updateFakturStatus(target, "dibatalkan");
    const after = await listArusKas();
    expect(after.filter((e) => e.referensiId === target).length).toBe(0);
    expect(after.length).toBe(before.length);
  });

  it("triggers via role lookup, not a literal string — relabeling 'lunas' still posts", async () => {
    await updateStatusLabel("lunas", "faktur", "Paid (Test)");
    const target = encodeInvTermin(9, 2026, 0);
    const before = await listArusKas();
    await updateFaktur(target, { status: "lunas" });
    const after = await listArusKas();
    expect(after.filter((e) => e.referensiId === target && e.sumber === "otomatis_faktur").length).toBeGreaterThan(0);
    expect(after.length).toBeGreaterThan(before.length);
    await updateStatusLabel("lunas", "faktur", "Lunas"); // restore
  });
});
