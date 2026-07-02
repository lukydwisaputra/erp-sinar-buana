import { describe, it, expect } from "vitest";
import { kesehatanProyek, computeProjectProfitability } from "@/lib/dasbor/project-profit";
import type { Proyek } from "@/lib/schemas/proyek";
import type { Sph } from "@/lib/schemas/penawaran";
import type { RealisasiRab } from "@/lib/schemas/realisasi-rab";
import type { Faktur } from "@/lib/schemas/faktur";

describe("kesehatanProyek", () => {
  it("merah when realisasi exceeds RAB plan", () => {
    expect(kesehatanProyek({ rabRencana: 100, realisasi: 120, marginRencana: 50, marginAktual: -20 })).toBe("merah");
  });
  it("abu when no realisasi recorded", () => {
    expect(kesehatanProyek({ rabRencana: 100, realisasi: null, marginRencana: 50, marginAktual: null })).toBe("abu");
  });
  it("kuning when actual margin slips below plan by more than threshold", () => {
    // plan 50, actual 40 -> slip 10 > 10% of 50 (=5)
    expect(kesehatanProyek({ rabRencana: 100, realisasi: 60, marginRencana: 50, marginAktual: 40 })).toBe("kuning");
  });
  it("hijau when actual margin is on track", () => {
    expect(kesehatanProyek({ rabRencana: 100, realisasi: 50, marginRencana: 50, marginAktual: 49 })).toBe("hijau");
  });
  it("merah takes priority over kuning when both conditions hold", () => {
    expect(kesehatanProyek({ rabRencana: 100, realisasi: 110, marginRencana: 50, marginAktual: 10 })).toBe("merah");
  });

  it("respects a custom ambang threshold (Konfigurasi Sistem dashboard-params.ambangMarginProyek)", () => {
    // plan 50, actual 44 -> slip 6, which is 12% of plan (>10% default, <20% custom)
    const args = { rabRencana: 100, realisasi: 56, marginRencana: 50, marginAktual: 44 };
    expect(kesehatanProyek(args)).toBe("kuning"); // default ambang 0.1
    expect(kesehatanProyek({ ...args, ambang: 0.2 })).toBe("hijau"); // widened threshold tolerates the same slip
  });
});

describe("computeProjectProfitability", () => {
  const sph: Sph = {
    items: [{ rab: { personil: [{ uraian: "A", vol: 1, satuan: "x", hargaSatuan: 30_000_000 }],
                     langsung: [{ uraian: "B", vol: 1, satuan: "x", hargaSatuan: 20_000_000 }] } }],
  } as unknown as Sph;
  const proyek: Proyek = {
    id: "P1", nama: "Proyek Satu", sphId: "SPH-1", nilaiKontrak: 100_000_000,
  } as unknown as Proyek;
  const faktur = {
    sphId: "SPH-1", status: "lunas", tanggal: "2026-06-10", terminIndex: 0,
    terminList: [{ label: "I", persen: 100, pemicu: "" }],
    items: [{ uraian: "j", volume: 1, harga: 100_000_000, satuan: "ls" }],
    ppnAktif: false, ppnPersen: 11, pph23Aktif: false, pph23Persen: 2, id: "INV-1",
  } as unknown as Faktur;

  it("computes plan margin, actual margin, and % budget used", () => {
    const rows = computeProjectProfitability({
      proyeks: [proyek],
      sphById: new Map([["SPH-1", sph]]),
      fakturs: [faktur],
      realisasi: [{ id: "r1", proyekId: "P1", kategori: "personil", rabLineLabel: "x", jumlah: 25_000_000, tanggal: "2026-06-05", keterangan: "" } as RealisasiRab],
    });
    expect(rows).toHaveLength(1);
    const r = rows[0];
    expect(r.nilaiKontrak).toBe(100_000_000);
    expect(r.pendapatanDiakui).toBe(100_000_000);
    expect(r.rabRencana).toBe(50_000_000);
    expect(r.realisasi).toBe(25_000_000);
    expect(r.marginRencana).toBe(50_000_000);          // 100jt - 50jt
    expect(r.marginAktual).toBe(75_000_000);           // 100jt recognized - 25jt realisasi
    expect(r.persenAnggaranTerpakai).toBeCloseTo(50);  // 25/50
    expect(r.kesehatan).toBe("hijau");
  });

  it("marks realisasi null and health abu when no realisasi recorded", () => {
    const rows = computeProjectProfitability({
      proyeks: [proyek], sphById: new Map([["SPH-1", sph]]), fakturs: [faktur], realisasi: [],
    });
    expect(rows[0].realisasi).toBeNull();
    expect(rows[0].marginAktual).toBeNull();
    expect(rows[0].persenAnggaranTerpakai).toBeNull();
    expect(rows[0].kesehatan).toBe("abu");
  });

  it("handles a project whose SPH is missing (rabRencana 0)", () => {
    const orphan = { ...proyek, id: "P2", sphId: "SPH-X" } as Proyek;
    const rows = computeProjectProfitability({
      proyeks: [orphan], sphById: new Map([["SPH-1", sph]]), fakturs: [], realisasi: [],
    });
    expect(rows[0].rabRencana).toBe(0);
    expect(rows[0].pendapatanDiakui).toBe(0);
    expect(rows[0].realisasi).toBeNull();
    expect(rows[0].persenAnggaranTerpakai).toBeNull();
    expect(rows[0].kesehatan).toBe("abu");
  });
});
