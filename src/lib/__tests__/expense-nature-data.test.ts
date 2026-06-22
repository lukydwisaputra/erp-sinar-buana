import { describe, it, expect } from "vitest";
import {
  listExpenseNature,
  getSifatBeban,
  setSifatBeban,
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
