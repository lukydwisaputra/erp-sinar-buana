import { describe, it, expect } from "vitest";
import {
  toInvoiceTermin,
  toFakturInduk,
  flattenTermins,
  type MasterInvoiceRow,
  type MasterInvoiceServiceRow,
  type MasterInvoiceTermRow,
  type InstallmentInvoiceRow,
} from "@/lib/faktur/mapping";
import type { InvoiceTermin } from "@/lib/schemas/faktur";

function installment(overrides: Partial<InstallmentInvoiceRow> = {}): InstallmentInvoiceRow {
  return {
    id: "inv-1", number: "INV/001/06.2026", numberYear: 2026, numberMonth: 6,
    masterInvoiceId: "mi-1", termId: "term-1", label: "Termin I",
    date: "2026-06-10", dueDate: "2026-06-24", bankAccountId: "bank-1",
    statusId: "status-1", paidDate: null,
    currentTermValue: "50000000", dpp: "45833333", ppn: "5500000", pph23: "1000000",
    totalAfterTax: "54333333", grossIncome: "50000000", netIncome: "49000000",
    notes: null,
    createdAt: new Date("2026-06-10T00:00:00.000Z"), updatedAt: new Date(),
    createdBy: null, updatedBy: null, deletedAt: null, deletedBy: null,
    ...overrides,
  } as InstallmentInvoiceRow;
}

function masterInvoice(overrides: Partial<MasterInvoiceRow> = {}): MasterInvoiceRow {
  return {
    id: "mi-1", number: "INV/001/06.2026", numberYear: 2026, numberMonth: 6,
    projectId: "proj-1", companyId: "company-1",
    totalCost: "100000000", statusId: "status-1", notes: null,
    createdAt: new Date("2026-06-01T00:00:00.000Z"), updatedAt: new Date(),
    createdBy: null, updatedBy: null, deletedAt: null, deletedBy: null,
    ...overrides,
  } as MasterInvoiceRow;
}

describe("toInvoiceTermin", () => {
  it("coerces numeric DB columns and resolves bank/status labels", () => {
    const termin = toInvoiceTermin({
      installment: installment(),
      statusLabel: "Belum Lunas",
      statusSystemRole: null,
      bankAccount: { bankName: "BCA", accountHolder: "PT Sinar Buana", accountNumber: "123456" },
      previousInstallments: [],
      indukNumber: "INV/001/06.2026",
      terminIndex: 0,
    });
    expect(termin.nilaiTermin).toBe(50_000_000);
    expect(termin.dpp).toBe(45_833_333);
    expect(termin.ppn).toBe(5_500_000);
    expect(termin.pph23).toBe(1_000_000);
    expect(termin.totalSetelahPajak).toBe(54_333_333);
    expect(termin.status).toBe("Belum Lunas");
    expect(termin.statusSystemRole).toBeNull();
    expect(termin.bankNama).toBe("BCA");
    expect(termin.bankNoRekening).toBe("123456");
  });

  it("falls back to empty bank fields when no bank account is linked", () => {
    const termin = toInvoiceTermin({
      installment: installment({ bankAccountId: null }),
      statusLabel: null,
      statusSystemRole: null,
      bankAccount: null,
      previousInstallments: [],
      indukNumber: "INV/001/06.2026",
      terminIndex: 0,
    });
    expect(termin.bankNama).toBe("");
    expect(termin.bankAtasNama).toBe("");
    expect(termin.bankNoRekening).toBe("");
    expect(termin.status).toBe("—");
  });

  it("derives previousTermins from earlier sibling installments' pre-tax value, not stored state", () => {
    const first = installment({ id: "inv-1", label: "Termin I", currentTermValue: "30000000", totalAfterTax: "33000000" });
    const second = installment({ id: "inv-2", label: "Termin II", currentTermValue: "40000000", totalAfterTax: "44000000" });
    const termin = toInvoiceTermin({
      installment: second,
      statusLabel: "Belum Lunas",
      statusSystemRole: null,
      bankAccount: null,
      previousInstallments: [first],
      indukNumber: "INV/001/06.2026",
      terminIndex: 1,
    });
    expect(termin.previousTermins).toEqual([{ label: "Termin I", nilai: 30_000_000, pemicu: null }]);
  });

  it("derives the displayed number from the Induk's number + 1-based termin position, not the row's own (legacy/unused) column", () => {
    const termin = toInvoiceTermin({
      installment: installment({ number: "some-stale-legacy-value" }),
      statusLabel: "Belum Lunas",
      statusSystemRole: null,
      bankAccount: null,
      previousInstallments: [],
      indukNumber: "INV/001/06.2026",
      terminIndex: 2,
    });
    expect(termin.number).toBe("INV/001/06.2026-T3");
  });

  it("returns null when the Induk itself has no number yet", () => {
    const termin = toInvoiceTermin({
      installment: installment(),
      statusLabel: "Belum Lunas",
      statusSystemRole: null,
      bankAccount: null,
      previousInstallments: [],
      indukNumber: null,
      terminIndex: 0,
    });
    expect(termin.number).toBeNull();
  });
});

describe("toFakturInduk", () => {
  const termins: InvoiceTermin[] = [];

  function services(overrides: Partial<MasterInvoiceServiceRow>[] = []): MasterInvoiceServiceRow[] {
    return overrides.map((o, i) => ({
      id: `mis-${i}`, masterInvoiceId: "mi-1", serviceId: null, description: null,
      createdAt: new Date(), updatedAt: new Date(),
      ...o,
    })) as MasterInvoiceServiceRow[];
  }

  function terms(overrides: Partial<MasterInvoiceTermRow>[] = []): MasterInvoiceTermRow[] {
    return overrides.map((o, i) => ({
      id: `term-${i}`, masterInvoiceId: "mi-1", label: `Termin ${i}`, percentage: "50", sortOrder: i,
      createdAt: new Date(), updatedAt: new Date(),
      ...o,
    })) as MasterInvoiceTermRow[];
  }

  it("resolves layanan names from the service catalog, falling back to the row's own description", () => {
    const induk = toFakturInduk({
      masterInvoice: masterInvoice(),
      proyekNama: "Proyek Uji", proyekNumber: null, sphNumber: null, pricingByServiceId: new Map(), signatureImage: null,
      companyName: "PT Klien",
      statusLabel: "Belum Lunas",
      statusSystemRole: null,
      services: services([{ serviceId: "svc-1" }, { serviceId: null, description: "Layanan Kustom" }]),
      serviceNamesById: new Map([["svc-1", "Penyusunan Amdal"]]),
      terms: terms([{ sortOrder: 0 }]),
      termins,
    });
    expect(induk.layanan).toEqual([
      { serviceId: "svc-1", nama: "Penyusunan Amdal", harga: null, volume: null, satuan: null },
      { serviceId: null, nama: "Layanan Kustom", harga: null, volume: null, satuan: null },
    ]);
  });

  it("fills in harga/volume/satuan from pricingByServiceId when the project has a source SPH", () => {
    const induk = toFakturInduk({
      masterInvoice: masterInvoice(),
      proyekNama: "Proyek Uji", proyekNumber: null, sphNumber: "SPH/001/1.2026",
      pricingByServiceId: new Map([["svc-1", { harga: 25_000_000, volume: 2, satuan: "Paket" }]]), signatureImage: null,
      companyName: "PT Klien",
      statusLabel: "Belum Lunas",
      statusSystemRole: null,
      services: services([{ serviceId: "svc-1" }, { serviceId: "svc-2" }]),
      serviceNamesById: new Map([["svc-1", "Penyusunan Amdal"], ["svc-2", "Dokumen UKL-UPL"]]),
      terms: terms([{ sortOrder: 0 }]),
      termins,
    });
    expect(induk.layanan).toEqual([
      { serviceId: "svc-1", nama: "Penyusunan Amdal", harga: 25_000_000, volume: 2, satuan: "Paket" },
      { serviceId: "svc-2", nama: "Dokumen UKL-UPL", harga: null, volume: null, satuan: null },
    ]);
  });

  it("carries the pemicu (keterangan) through to each term scheme item, nullable when unset", () => {
    const induk = toFakturInduk({
      masterInvoice: masterInvoice(),
      proyekNama: "Proyek Uji", proyekNumber: null, sphNumber: null, pricingByServiceId: new Map(), signatureImage: null,
      companyName: "PT Klien",
      statusLabel: null,
      statusSystemRole: null,
      services: [],
      serviceNamesById: new Map(),
      terms: terms([{ sortOrder: 0, pemicu: "Pelunasan" }, { sortOrder: 1 }]),
      termins,
    });
    expect(induk.terminScheme).toEqual([
      { label: "Termin 0", persen: 50, pemicu: "Pelunasan" },
      { label: "Termin 1", persen: 50, pemicu: null },
    ]);
  });

  it("sorts the term scheme by sortOrder regardless of input order", () => {
    const induk = toFakturInduk({
      masterInvoice: masterInvoice(),
      proyekNama: "Proyek Uji", proyekNumber: null, sphNumber: null, pricingByServiceId: new Map(), signatureImage: null,
      companyName: "PT Klien",
      statusLabel: "Belum Lunas",
      statusSystemRole: null,
      services: [],
      serviceNamesById: new Map(),
      terms: [
        { id: "t2", masterInvoiceId: "mi-1", label: "Termin II", percentage: "50", sortOrder: 1, createdAt: new Date(), updatedAt: new Date() } as MasterInvoiceTermRow,
        { id: "t1", masterInvoiceId: "mi-1", label: "Termin I", percentage: "50", sortOrder: 0, createdAt: new Date(), updatedAt: new Date() } as MasterInvoiceTermRow,
      ],
      termins,
    });
    expect(induk.terminScheme.map((t) => t.label)).toEqual(["Termin I", "Termin II"]);
  });

  it("coerces totalBiaya to a number", () => {
    const induk = toFakturInduk({
      masterInvoice: masterInvoice({ totalCost: "250000000" }),
      proyekNama: "Proyek Uji", proyekNumber: null, sphNumber: null, pricingByServiceId: new Map(), signatureImage: null,
      companyName: "PT Klien",
      statusLabel: null,
      statusSystemRole: null,
      services: [],
      serviceNamesById: new Map(),
      terms: [],
      termins,
    });
    expect(induk.totalBiaya).toBe(250_000_000);
  });
});

describe("flattenTermins", () => {
  it("carries proyekId/perusahaanNama down onto each termin row", () => {
    const termin = toInvoiceTermin({
      installment: installment(),
      statusLabel: "Belum Lunas",
      statusSystemRole: null,
      bankAccount: null,
      previousInstallments: [],
      indukNumber: "INV/001/06.2026",
      terminIndex: 0,
    });
    const induk = toFakturInduk({
      masterInvoice: masterInvoice({ projectId: "proj-1" }),
      proyekNama: "Proyek Uji", proyekNumber: null, sphNumber: null, pricingByServiceId: new Map(), signatureImage: null,
      companyName: "PT Klien",
      statusLabel: "Belum Lunas",
      statusSystemRole: null,
      services: [],
      serviceNamesById: new Map(),
      terms: [],
      termins: [termin],
    });

    const rows = flattenTermins([induk]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: termin.id,
      proyekId: "proj-1",
      perusahaanNama: "PT Klien",
      nilaiTermin: 50_000_000,
      pph23: 1_000_000,
      netIncome: 49_000_000,
    });
  });

  it("returns an empty array for induks with no generated termins", () => {
    const induk = toFakturInduk({
      masterInvoice: masterInvoice(),
      proyekNama: "Proyek Uji", proyekNumber: null, sphNumber: null, pricingByServiceId: new Map(), signatureImage: null,
      companyName: "PT Klien",
      statusLabel: null,
      statusSystemRole: null,
      services: [],
      serviceNamesById: new Map(),
      terms: [],
      termins: [],
    });
    expect(flattenTermins([induk])).toEqual([]);
  });
});
