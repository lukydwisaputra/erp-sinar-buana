import { describe, it, expect } from "vitest";
import { listOptions, createOption, updateOption, deleteOption, moveOption } from "@/lib/data/daftar-pilihan";

describe("listOptions", () => {
  it("returns only active items by default", async () => {
    const rows = await listOptions("kewenangan");
    expect(rows.every((r) => r.aktif)).toBe(true);
  });

  it("includes inactive items when requested", async () => {
    const created = await createOption("kewenangan", "Uji Nonaktif");
    await updateOption(created.id, { aktif: false });
    const active = await listOptions("kewenangan");
    const all = await listOptions("kewenangan", { includeInactive: true });
    expect(active.find((r) => r.id === created.id)).toBeUndefined();
    expect(all.find((r) => r.id === created.id)).toBeDefined();
  });

  it("sorts by urutan", async () => {
    const rows = await listOptions("jenis_dokumen");
    const urutans = rows.map((r) => r.urutan);
    expect(urutans).toEqual([...urutans].sort((a, b) => a - b));
  });
});

describe("createOption", () => {
  it("rejects a duplicate name within the same category", async () => {
    await createOption("dasar_hukum", "Uji Duplikat");
    await expect(createOption("dasar_hukum", "Uji Duplikat")).rejects.toThrow("sudah ada");
  });

  it("allows the same name across two different categories", async () => {
    await createOption("jabatan", "Uji Lintas Kategori");
    await expect(createOption("area_kawasan", "Uji Lintas Kategori")).resolves.toBeDefined();
  });

  it("stores extra metadata (e.g. pengali)", async () => {
    const created = await createOption("status_kepegawaian", "Uji Status", { pengali: 0.9 });
    expect(created.extra.pengali).toBe(0.9);
  });

  it("rejects an empty name", async () => {
    await expect(createOption("jabatan", "   ")).rejects.toThrow("wajib diisi");
  });
});

describe("updateOption", () => {
  it("allows updating extra fields (e.g. pengali) on a row", async () => {
    const created = await createOption("status_kepegawaian", "Uji Status 2", { pengali: 0.9 });
    const updated = await updateOption(created.id, { extra: { pengali: 0.95 } });
    expect(updated.extra.pengali).toBe(0.95);
  });

  it("throws for unknown id", async () => {
    await expect(updateOption("OPT-9999", { aktif: false })).rejects.toThrow("tidak ditemukan");
  });
});

describe("deleteOption", () => {
  it("deletes a never-used custom row", async () => {
    const created = await createOption("area_kawasan", "Uji Hapus");
    await deleteOption(created.id);
    const rows = await listOptions("area_kawasan", { includeInactive: true });
    expect(rows.find((r) => r.id === created.id)).toBeUndefined();
  });
});

describe("moveOption", () => {
  it("swaps urutan with the previous sibling on 'up'", async () => {
    const a = await createOption("jenis_dokumen", "Uji Urut A");
    const b = await createOption("jenis_dokumen", "Uji Urut B");
    const result = await moveOption(b.id, "up");
    const ra = result.find((r) => r.id === a.id)!;
    const rb = result.find((r) => r.id === b.id)!;
    expect(rb.urutan).toBeLessThan(ra.urutan);
  });

  it("is a no-op at the top boundary", async () => {
    const rows = await listOptions("kewenangan");
    const result = await moveOption(rows[0].id, "up");
    expect(result[0].id).toBe(rows[0].id);
  });

  it("is a no-op at the bottom boundary", async () => {
    const rows = await listOptions("kewenangan", { includeInactive: true });
    const last = rows[rows.length - 1];
    const result = await moveOption(last.id, "down");
    expect(result[result.length - 1].id).toBe(last.id);
  });
});
