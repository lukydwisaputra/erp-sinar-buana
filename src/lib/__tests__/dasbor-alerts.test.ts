import { describe, it, expect } from "vitest";
import {
  alertsFaktur, alertsPajak, alertsProyek, computeAlerts,
  FAKTUR_DUE_SOON_DAYS, PAJAK_DUE_SOON_DAYS,
} from "@/lib/dasbor/alerts";
import type { Faktur } from "@/lib/schemas/faktur";
import type { KewajibanPajak } from "@/lib/schemas/kewajiban-pajak";
import type { ProyekProfit } from "@/lib/dasbor/types";

const TODAY = "2026-06-22";

const mkFaktur = (id: string, jatuhTempo: string, status: "terkirim" | "lunas" = "terkirim"): Faktur => ({
  id, sphId: "SPH-1", perusahaanId: "C1", perusahaanNama: "PT Klien",
  alamat: "", kota: "", npwp: "", tanggal: "2026-06-01", jatuhTempo,
  items: [{ uraian: "Jasa", volume: 1, harga: 100_000_000, satuan: "ls" }],
  terminList: [{ label: "I", persen: 100, pemicu: "" }], terminIndex: 0,
  ppnAktif: false, ppnPersen: 11, pph23Aktif: false, pph23Persen: 2,
  catatan: [], status, tanggalBayar: "",
  bankNama: "", bankAtasNama: "", bankNoRekening: "",
  jabatanPenerima: "Direktur", picAktif: false, picNama: "", picJabatan: "",
});

const mkKewajiban = (
  id: string, jatuhTempo: string,
  opts: Partial<KewajibanPajak> = {},
): KewajibanPajak => ({
  id, jenis: "ppn", periode: "2026-06", jumlah: 5_000_000,
  jatuhTempo, status: "belum_setor", buktiPotongDiterima: true, keterangan: "",
  ...opts,
});

const mkProyek = (id: string, kesehatan: ProyekProfit["kesehatan"]): ProyekProfit => ({
  proyekId: id, proyekNama: "Proyek " + id, nilaiKontrak: 100_000_000,
  pendapatanDiakui: 50_000_000, rabRencana: 30_000_000,
  realisasi: kesehatan === "abu" ? null : 35_000_000,
  marginRencana: 70_000_000, marginAktual: kesehatan === "abu" ? null : 15_000_000,
  persenAnggaranTerpakai: kesehatan === "abu" ? null : 116,
  kesehatan,
});

describe("alertsFaktur", () => {
  it("flags overdue invoices as tinggi", () => {
    const alerts = alertsFaktur([mkFaktur("F1", "2026-06-10")], TODAY);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].jenis).toBe("faktur_terlambat");
    expect(alerts[0].prioritas).toBe("tinggi");
    expect(alerts[0].refId).toBe("F1");
  });

  it("flags invoices due within FAKTUR_DUE_SOON_DAYS as sedang", () => {
    const jatuhTempo = "2026-06-25"; // 3 days from TODAY
    const alerts = alertsFaktur([mkFaktur("F2", jatuhTempo)], TODAY);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].jenis).toBe("faktur_jatuh_tempo");
    expect(alerts[0].prioritas).toBe("sedang");
  });

  it("includes invoice due exactly FAKTUR_DUE_SOON_DAYS away (boundary inclusive)", () => {
    const alerts = alertsFaktur([mkFaktur("F-boundary", "2026-06-29")], TODAY); // TODAY + 7
    expect(alerts).toHaveLength(1);
    expect(alerts[0].jenis).toBe("faktur_jatuh_tempo");
  });

  it("excludes invoice due FAKTUR_DUE_SOON_DAYS+1 days away (not overdue, not due-soon)", () => {
    const alerts = alertsFaktur([mkFaktur("F-beyond", "2026-06-30")], TODAY); // TODAY + 8
    expect(alerts).toHaveLength(0);
  });

  it("ignores paid invoices and future invoices beyond window", () => {
    const alerts = alertsFaktur([
      mkFaktur("F3", "2026-06-10", "lunas"),  // paid
      mkFaktur("F4", "2026-08-01"),            // beyond FAKTUR_DUE_SOON_DAYS, not overdue
    ], TODAY);
    expect(alerts).toHaveLength(0);
  });
});

describe("alertsPajak", () => {
  it("flags overdue obligations as tinggi", () => {
    const alerts = alertsPajak([mkKewajiban("K1", "2026-06-15")], TODAY);
    expect(alerts.find(a => a.jenis === "pajak_terlambat")).toBeTruthy();
    expect(alerts.find(a => a.jenis === "pajak_terlambat")!.prioritas).toBe("tinggi");
  });

  it("flags obligations due within PAJAK_DUE_SOON_DAYS as sedang", () => {
    const alerts = alertsPajak([mkKewajiban("K2", "2026-06-24")], TODAY); // 2 days away
    expect(alerts.find(a => a.jenis === "pajak_jatuh_tempo")).toBeTruthy();
    expect(alerts.find(a => a.jenis === "pajak_jatuh_tempo")!.prioritas).toBe("sedang");
  });

  it("flags PPh 23 without bukti potong as sedang", () => {
    const k = mkKewajiban("K3", "2026-07-01", { jenis: "pph23", buktiPotongDiterima: false });
    const alerts = alertsPajak([k], TODAY);
    expect(alerts.find(a => a.jenis === "bukti_potong_belum")).toBeTruthy();
    expect(alerts.find(a => a.jenis === "bukti_potong_belum")!.prioritas).toBe("sedang");
  });

  it("ignores already-submitted obligations", () => {
    const k = mkKewajiban("K4", "2026-06-15", { status: "disetor" });
    const alerts = alertsPajak([k], TODAY);
    // no terlambat/jatuh_tempo for disetor; check no terlambat or jatuh_tempo
    expect(alerts.filter(a => a.jenis === "pajak_terlambat" || a.jenis === "pajak_jatuh_tempo")).toHaveLength(0);
  });

  it("still flags PPh 23 bukti potong even when obligation is disetor", () => {
    const k = mkKewajiban("K5", "2026-07-01", { jenis: "pph23", status: "disetor", buktiPotongDiterima: false });
    const alerts = alertsPajak([k], TODAY);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].jenis).toBe("bukti_potong_belum");
  });
});

describe("alertsProyek", () => {
  it("flags merah as over_budget tinggi", () => {
    const alerts = alertsProyek([mkProyek("P1", "merah")]);
    expect(alerts[0].jenis).toBe("proyek_over_budget");
    expect(alerts[0].prioritas).toBe("tinggi");
  });

  it("flags kuning as margin_slip sedang", () => {
    const alerts = alertsProyek([mkProyek("P2", "kuning")]);
    expect(alerts[0].jenis).toBe("proyek_margin_slip");
    expect(alerts[0].prioritas).toBe("sedang");
  });

  it("ignores hijau and abu projects", () => {
    expect(alertsProyek([mkProyek("P3", "hijau")])).toHaveLength(0);
    expect(alertsProyek([mkProyek("P4", "abu")])).toHaveLength(0);
  });
});

describe("computeAlerts", () => {
  it("merges and sorts tinggi before sedang", () => {
    const alerts = computeAlerts({
      fakturs: [mkFaktur("F1", "2026-06-10"), mkFaktur("F2", "2026-06-24")],
      kewajiban: [],
      proyek: [],
      today: TODAY,
    });
    expect(alerts[0].prioritas).toBe("tinggi");
    expect(alerts[1].prioritas).toBe("sedang");
  });
});
