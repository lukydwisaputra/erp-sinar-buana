import { describe, it, expect } from "vitest";
import {
  listExpenseNature,
  getSifatBeban,
  setSifatBeban,
  listExpenseNatureRows,
  createKategoriArusKas,
  deleteKategoriArusKas,
  LOCKED_KATEGORI,
} from "@/lib/data/expense-nature";

describe("listExpenseNature", () => {
  it("returns seeded category mappings", async () => {
    const rows = await listExpenseNature();
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });
});

describe("getSifatBeban — BR-14 defaults", () => {
  it("maps pajak to non_laba_rugi (PPh 23 / PPN are not expenses)", async () => {
    expect(await getSifatBeban("pajak")).toBe("non_laba_rugi");
  });

  it("maps penggajian to operasional, not hpp (avoids double count)", async () => {
    expect(await getSifatBeban("penggajian")).toBe("operasional");
  });

  it("falls back to operasional for unknown categories", async () => {
    expect(await getSifatBeban("Kategori Tak Dikenal")).toBe("operasional");
  });
});

describe("setSifatBeban", () => {
  it("updates an existing category mapping", async () => {
    const updated = await setSifatBeban("Operasional", "hpp");
    expect(updated.sifat).toBe("hpp");
    expect(await getSifatBeban("Operasional")).toBe("hpp");
  });

  it("inserts a mapping for a new category", async () => {
    const created = await setSifatBeban("Konsultan Eksternal", "hpp");
    expect(created.kategori).toBe("Konsultan Eksternal");
    expect(await getSifatBeban("Konsultan Eksternal")).toBe("hpp");
  });
});

describe("LOCKED_KATEGORI", () => {
  it("matches the arusKasKategori enum exactly", () => {
    expect([...LOCKED_KATEGORI].sort()).toEqual(["bonus", "faktur", "pajak", "penggajian"]);
  });
});

describe("listExpenseNatureRows", () => {
  it("marks faktur/penggajian/pajak/bonus as locked", async () => {
    const rows = await listExpenseNatureRows();
    for (const k of ["faktur", "penggajian", "pajak", "bonus"]) {
      expect(rows.find((r) => r.kategori === k)?.locked).toBe(true);
    }
  });

  it("marks custom categories as not locked", async () => {
    const rows = await listExpenseNatureRows();
    expect(rows.find((r) => r.kategori === "Sewa Kantor")?.locked).toBe(false);
  });
});

describe("createKategoriArusKas", () => {
  it("creates a new custom category", async () => {
    const row = await createKategoriArusKas("Biaya Marketing", "operasional");
    expect(row.locked).toBe(false);
  });

  it("rejects a name colliding with a locked category", async () => {
    await expect(createKategoriArusKas("faktur", "operasional")).rejects.toThrow("bentrok");
  });

  it("rejects a duplicate custom name", async () => {
    await createKategoriArusKas("Biaya Unik", "operasional");
    await expect(createKategoriArusKas("Biaya Unik", "non_laba_rugi")).rejects.toThrow("sudah ada");
  });

  it("rejects sifat hpp", async () => {
    await expect(createKategoriArusKas("Biaya Lain", "hpp")).rejects.toThrow("HPP");
  });
});

describe("deleteKategoriArusKas", () => {
  it("rejects deleting a locked category", async () => {
    await expect(deleteKategoriArusKas("bonus")).rejects.toThrow("tidak dapat dihapus");
  });

  it("deletes a custom category", async () => {
    await createKategoriArusKas("Biaya Sementara", "operasional");
    await deleteKategoriArusKas("Biaya Sementara");
    const rows = await listExpenseNatureRows();
    expect(rows.find((r) => r.kategori === "Biaya Sementara")).toBeUndefined();
  });
});
