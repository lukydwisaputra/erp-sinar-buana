import { describe, it, expect } from "vitest";
import {
  listRealisasiRab,
  listRealisasiRabByProyek,
  createRealisasiRab,
  removeRealisasiRab,
} from "@/lib/data/realisasi-rab";

describe("listRealisasiRab", () => {
  it("returns seeded realisasi rows", async () => {
    const rows = await listRealisasiRab();
    expect(rows.length).toBeGreaterThanOrEqual(2);
  });

  it("seeds both personil and langsung categories", async () => {
    const rows = await listRealisasiRab();
    expect(rows.some((r) => r.kategori === "personil")).toBe(true);
    expect(rows.some((r) => r.kategori === "langsung")).toBe(true);
  });
});

describe("listRealisasiRabByProyek", () => {
  it("filters to a single project", async () => {
    const all = await listRealisasiRab();
    const proyekId = all[0].proyekId;
    const filtered = await listRealisasiRabByProyek(proyekId);
    expect(filtered.length).toBeGreaterThanOrEqual(1);
    expect(filtered.every((r) => r.proyekId === proyekId)).toBe(true);
  });
});

describe("createRealisasiRab", () => {
  it("creates a row with generated RRB id", async () => {
    const before = await listRealisasiRab();
    const entry = await createRealisasiRab({
      proyekId: before[0].proyekId,
      kategori: "langsung",
      rabLineLabel: "Sewa Alat",
      jumlah: 5_000_000,
      tanggal: "2026-06-10",
      keterangan: "Test realisasi",
    });
    expect(entry.id).toMatch(/^RRB-/);
    const after = await listRealisasiRab();
    expect(after.length).toBe(before.length + 1);
  });
});

describe("removeRealisasiRab", () => {
  it("removes a row", async () => {
    const created = await createRealisasiRab({
      proyekId: "P-TEST",
      kategori: "personil",
      rabLineLabel: "X",
      jumlah: 1_000_000,
      tanggal: "2026-06-10",
      keterangan: "to delete",
    });
    await removeRealisasiRab(created.id);
    const after = await listRealisasiRab();
    expect(after.find((r) => r.id === created.id)).toBeUndefined();
  });

  it("throws for unknown id", async () => {
    await expect(removeRealisasiRab("RRB-9999")).rejects.toThrow("tidak ditemukan");
  });
});
