import { describe, it, expect } from "vitest";
import { sumRabPlan } from "@/lib/dasbor/rab-plan";

const sph = {
  items: [
    {
      layananId: "1",
      nama: "Service A",
      volume: 1,
      harga: 25_000_000,
      satuan: "paket",
      rab: {
        personil: [{ uraian: "Ahli", vol: 2, satuan: "OB", hargaSatuan: 10_000_000 }],
        langsung: [{ uraian: "Transport", vol: 1, satuan: "ls", hargaSatuan: 5_000_000 }],
      },
      jadwal: {
        kegiatan: ["Survei"],
        highlights: [[1, 2, 3]],
        bulan: 1,
      },
    },
    {
      layananId: "2",
      nama: "Service B",
      volume: 1,
      harga: 12_000_000,
      satuan: "paket",
      rab: {
        personil: [{ uraian: "Surveyor", vol: 3, satuan: "OB", hargaSatuan: 4_000_000 }],
        langsung: [],
      },
      jadwal: {
        kegiatan: ["Analisis"],
        highlights: [[4, 5, 6]],
        bulan: 2,
      },
    },
  ],
};

describe("sumRabPlan", () => {
  it("sums personil (A) across items", () => {
    expect(sumRabPlan(sph).personil).toBe(2 * 10_000_000 + 3 * 4_000_000);
  });

  it("sums langsung (B) across items", () => {
    expect(sumRabPlan(sph).langsung).toBe(5_000_000);
  });

  it("total is personil + langsung", () => {
    const p = sumRabPlan(sph);
    expect(p.total).toBe(p.personil + p.langsung);
  });

  it("returns zeros for empty items", () => {
    expect(sumRabPlan({ items: [] })).toEqual({ personil: 0, langsung: 0, total: 0 });
  });
});
