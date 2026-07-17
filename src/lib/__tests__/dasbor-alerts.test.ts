import { describe, it, expect } from "vitest";
import {
  alertsFaktur, alertsPajak, alertsProyek, alertsProyekMangkrak, alertsMilestoneSlipping, lastActivityDate, computeAlerts,
  FAKTUR_DUE_SOON_DAYS, PAJAK_DUE_SOON_DAYS,
} from "@/lib/dasbor/alerts";
import type { FakturTerminRow } from "@/lib/faktur/mapping";
import type { TaxEntry } from "@/lib/schemas/tax-entries";
import type { Proyek, Milestone } from "@/lib/schemas/proyek";
import type { ProyekProfit } from "@/lib/dasbor/types";

const TODAY = "2026-06-22";

const mkFaktur = (id: string, jatuhTempo: string, statusSystemRole: string | null = null): FakturTerminRow => ({
  id, indukId: "MI-" + id, number: "INV/" + id, proyekId: "P1", perusahaanNama: "PT Klien",
  tanggal: "2026-06-01", jatuhTempo, statusSystemRole,
  nilaiTermin: 100_000_000, pph23: 0, netIncome: 100_000_000, totalSetelahPajak: 100_000_000,
});

const mkKewajiban = (
  id: string, dueDate: string,
  opts: Partial<TaxEntry> = {},
): TaxEntry => ({
  id, taxType: "ppn_keluaran", nature: "kewajiban", taxPeriod: "2026-06-01", jumlah: 5_000_000,
  dueDate, settlementStatus: "belum_disetor", settledDate: null, ntpn: null,
  buktiPotongReceived: true, notes: "", companyId: null, employeeId: null,
  ...opts,
});

const mkProyekEntity = (id: string, statusSystemRole: string | null, overrides: Partial<Proyek> = {}): Proyek => ({
  id, number: "PRY/" + id, nama: "Proyek " + id, perusahaanId: "C1", perusahaanNama: "PT Klien",
  areaId: null, area: "—", tahun: 2026, layanan: [], statusId: null, status: "Aktif",
  statusSystemRole, nilaiKontrak: 100_000_000,
  sphId: null, sphNumber: null, fakturs: [], assignees: [], milestones: [], createdAt: "2026-01-01T00:00:00.000Z",
  shareToken: "token-" + id,
  ...overrides,
});

const mkMilestone = (id: string, targetDate: string | null, actualDate: string | null): Milestone => ({
  id, parentId: null, nama: "Milestone " + id, urutan: 1, description: null, descriptionAttachments: [],
  assignees: [], targetDate, actualDate, statusId: null, status: "Berjalan", triggersTerm: false, linkedMasterInvoiceId: null,
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
    expect(alerts[0].refId).toBe("MI-F1"); // refId points at the Induk, not the termin
  });

  it("titles the alert with the termin's displayed number, not its raw id", () => {
    const alerts = alertsFaktur([mkFaktur("F1", "2026-06-10")], TODAY);
    expect(alerts[0].judul).toBe("Faktur Terlambat: INV/F1");
    expect(alerts[0].judul).not.toContain("F1-");
  });

  it("falls back to the raw id in the title only when the termin has no number yet", () => {
    const alerts = alertsFaktur([{ ...mkFaktur("F1", "2026-06-10"), number: null }], TODAY);
    expect(alerts[0].judul).toBe("Faktur Terlambat: F1");
  });

  it("flags invoices due within FAKTUR_DUE_SOON_DAYS as sedang", () => {
    const jatuhTempo = "2026-06-25"; // 3 days from TODAY
    const alerts = alertsFaktur([mkFaktur("F2", jatuhTempo)], TODAY);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].jenis).toBe("faktur_jatuh_tempo");
    expect(alerts[0].prioritas).toBe("sedang");
    expect(alerts[0].judul).toBe("Faktur Jatuh Tempo: INV/F2");
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
      mkFaktur("F3", "2026-06-10", "LUNAS"),  // paid
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
    const k = mkKewajiban("K3", "2026-07-01", { taxType: "pph23_dipotong", buktiPotongReceived: false });
    const alerts = alertsPajak([k], TODAY);
    expect(alerts.find(a => a.jenis === "bukti_potong_belum")).toBeTruthy();
    expect(alerts.find(a => a.jenis === "bukti_potong_belum")!.prioritas).toBe("sedang");
  });

  it("ignores already-submitted obligations", () => {
    const k = mkKewajiban("K4", "2026-06-15", { settlementStatus: "sudah_disetor" });
    const alerts = alertsPajak([k], TODAY);
    // no terlambat/jatuh_tempo for disetor; check no terlambat or jatuh_tempo
    expect(alerts.filter(a => a.jenis === "pajak_terlambat" || a.jenis === "pajak_jatuh_tempo")).toHaveLength(0);
  });

  it("still flags PPh 23 bukti potong even when obligation is disetor", () => {
    const k = mkKewajiban("K5", "2026-07-01", { taxType: "pph23_dipotong", settlementStatus: "sudah_disetor", buktiPotongReceived: false });
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
      proyeks: [],
      today: TODAY,
      ambangMangkrakHari: 30,
    });
    expect(alerts[0].prioritas).toBe("tinggi");
    expect(alerts[1].prioritas).toBe("sedang");
  });
});

describe("lastActivityDate", () => {
  it("uses the most recent milestone actualDate", () => {
    const p = mkProyekEntity("P1", null, {
      milestones: [
        { id: "M1", parentId: null, nama: "A", urutan: 1, description: null, descriptionAttachments: [], assignees: [], targetDate: null, actualDate: "2026-05-01", statusId: null, status: "Selesai", triggersTerm: false, linkedMasterInvoiceId: null },
        { id: "M2", parentId: null, nama: "B", urutan: 2, description: null, descriptionAttachments: [], assignees: [], targetDate: null, actualDate: "2026-06-10", statusId: null, status: "Selesai", triggersTerm: false, linkedMasterInvoiceId: null },
      ],
    });
    expect(lastActivityDate(p)).toBe("2026-06-10");
  });

  it("falls back to createdAt when no milestone has an actualDate", () => {
    const p = mkProyekEntity("P2", null, { createdAt: "2026-03-15T10:00:00.000Z" });
    expect(lastActivityDate(p)).toBe("2026-03-15");
  });
});

describe("alertsMilestoneSlipping", () => {
  it("flags a milestone whose targetDate has passed with no actualDate", () => {
    const p = mkProyekEntity("P1", null, { milestones: [mkMilestone("M1", "2026-06-10", null)] });
    const alerts = alertsMilestoneSlipping([p], TODAY);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].jenis).toBe("milestone_slipping");
    expect(alerts[0].refType).toBe("proyek");
    expect(alerts[0].refId).toBe("P1");
  });

  it("does not flag a milestone with no targetDate", () => {
    const p = mkProyekEntity("P1", null, { milestones: [mkMilestone("M1", null, null)] });
    expect(alertsMilestoneSlipping([p], TODAY)).toHaveLength(0);
  });

  it("does not flag a milestone that already has an actualDate", () => {
    const p = mkProyekEntity("P1", null, { milestones: [mkMilestone("M1", "2026-06-10", "2026-06-15")] });
    expect(alertsMilestoneSlipping([p], TODAY)).toHaveLength(0);
  });

  it("does not flag a milestone whose targetDate hasn't passed yet", () => {
    const p = mkProyekEntity("P1", null, { milestones: [mkMilestone("M1", "2026-07-01", null)] });
    expect(alertsMilestoneSlipping([p], TODAY)).toHaveLength(0);
  });

  it("never flags milestones on a terminal SELESAI/BATAL project", () => {
    const p = mkProyekEntity("P1", "SELESAI", { milestones: [mkMilestone("M1", "2026-06-10", null)] });
    expect(alertsMilestoneSlipping([p], TODAY)).toHaveLength(0);
  });
});

describe("alertsProyekMangkrak", () => {
  it("flags a project with no recent activity past the threshold", () => {
    const p = mkProyekEntity("P1", null, { createdAt: "2026-05-01T00:00:00.000Z" });
    const alerts = alertsProyekMangkrak([p], TODAY, 30); // 2026-06-22 - 2026-05-01 = 52 days
    expect(alerts).toHaveLength(1);
    expect(alerts[0].jenis).toBe("proyek_mangkrak");
  });

  it("does not flag a project with recent activity", () => {
    const p = mkProyekEntity("P2", null, { createdAt: "2026-06-20T00:00:00.000Z" });
    expect(alertsProyekMangkrak([p], TODAY, 30)).toHaveLength(0);
  });

  it("never flags projects whose systemRole is a terminal SELESAI/BATAL, regardless of staleness", () => {
    const selesai = mkProyekEntity("P3", "SELESAI", { createdAt: "2026-01-01T00:00:00.000Z" });
    const dibatalkan = mkProyekEntity("P4", "BATAL", { createdAt: "2026-01-01T00:00:00.000Z" });
    expect(alertsProyekMangkrak([selesai, dibatalkan], TODAY, 30)).toHaveLength(0);
  });
});
