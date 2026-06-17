import { describe, it, expect } from "vitest";
import { listArusKas, createArusKas, removeArusKas } from "@/lib/data/arus-kas";

describe("listArusKas", () => {
  it("returns seeded entries including automated and manual", async () => {
    const rows = await listArusKas();
    expect(rows.length).toBeGreaterThanOrEqual(5);
    const automated = rows.filter((r) => r.locked);
    const manual = rows.filter((r) => !r.locked);
    expect(automated.length).toBeGreaterThanOrEqual(1);
    expect(manual.length).toBeGreaterThanOrEqual(1);
  });

  it("automated entries have referensiId", async () => {
    const rows = await listArusKas();
    const automated = rows.filter((r) => r.locked);
    for (const entry of automated) {
      expect(entry.referensiId).toBeTruthy();
    }
  });
});

describe("createArusKas", () => {
  it("creates a manual entry with generated id", async () => {
    const before = await listArusKas();
    const entry = await createArusKas({
      jenis: "debit",
      tanggal: "2026-06-01",
      jumlah: 1_500_000,
      kategori: "operasional",
      keterangan: "Test pengeluaran",
    });
    expect(entry.id).toMatch(/^AKS-/);
    expect(entry.sumber).toBe("manual");
    expect(entry.locked).toBe(false);
    const after = await listArusKas();
    expect(after.length).toBe(before.length + 1);
  });
});

describe("removeArusKas", () => {
  it("removes a manual entry", async () => {
    const rows = await listArusKas();
    const manual = rows.find((r) => !r.locked);
    expect(manual).toBeDefined();
    await removeArusKas(manual!.id);
    const after = await listArusKas();
    expect(after.find((r) => r.id === manual!.id)).toBeUndefined();
  });

  it("throws when trying to remove a locked entry", async () => {
    const rows = await listArusKas();
    const locked = rows.find((r) => r.locked);
    expect(locked).toBeDefined();
    await expect(removeArusKas(locked!.id)).rejects.toThrow("terkunci");
  });

  it("throws for unknown id", async () => {
    await expect(removeArusKas("AKS-9999")).rejects.toThrow();
  });
});
