import { describe, it, expect } from "vitest";
import { toRealisasiRab, RAB_CATEGORY_BY_KATEGORI, type RabActualRow } from "@/lib/realisasi-rab/mapping";

function row(overrides: Partial<RabActualRow> = {}): RabActualRow {
  return {
    id: "rab-1",
    projectId: "proj-1",
    rabCategory: "personil_a",
    rabLineLabel: "Tenaga Ahli",
    amount: "25000000",
    date: "2026-06-05",
    note: "Realisasi personil",
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  } as RabActualRow;
}

describe("toRealisasiRab", () => {
  it("translates rab_category personil_a/langsung_b to kategori personil/langsung", () => {
    expect(toRealisasiRab(row({ rabCategory: "personil_a" })).kategori).toBe("personil");
    expect(toRealisasiRab(row({ rabCategory: "langsung_b" })).kategori).toBe("langsung");
  });

  it("converts amount to a number", () => {
    expect(toRealisasiRab(row({ amount: "12345678" })).jumlah).toBe(12_345_678);
  });

  it("falls back to empty strings for nullable rabLineLabel/note", () => {
    const result = toRealisasiRab(row({ rabLineLabel: null, note: null }));
    expect(result.rabLineLabel).toBe("");
    expect(result.keterangan).toBe("");
  });

  it("always leaves arusKasId unset (Arus Kas isn't wired yet)", () => {
    expect(toRealisasiRab(row()).arusKasId).toBeUndefined();
  });
});

describe("RAB_CATEGORY_BY_KATEGORI", () => {
  it("round-trips personil/langsung through rab_category and back", () => {
    expect(RAB_CATEGORY_BY_KATEGORI.personil).toBe("personil_a");
    expect(RAB_CATEGORY_BY_KATEGORI.langsung).toBe("langsung_b");
  });
});
