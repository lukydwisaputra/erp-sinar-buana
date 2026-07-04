import { describe, it, expect } from "vitest";
import {
  toSph,
  STATUS_LABEL_BY_ENUM,
  ENUM_BY_STATUS_LABEL,
  quotationColumnsFromInput,
  type QuotationRow,
  type QuotationItemRow,
  type RabPersonnelRow,
  type RabDirectCostRow,
  type ScheduleRow,
  type ScheduleRowRow,
  type MarkedWeekRow,
  type ToSphInput,
} from "@/lib/penawaran/mapping";

function quotation(overrides: Partial<QuotationRow> = {}): QuotationRow {
  return {
    id: "quo-1",
    number: "SPH/00001/5.2026",
    numberYear: 2026,
    numberMonth: 5,
    date: "2026-05-04",
    companyId: "company-1",
    contactId: null,
    statusId: "status-1",
    subject: null,
    validityDays: 30,
    notes: "Catatan satu\nCatatan dua",
    totalAmount: "100000000",
    openingSentence: "Sehubungan dengan...",
    attachmentNote: "RAB dan Estimasi Waktu",
    recipientTitle: "Direktur",
    rincianActive: true,
    ppnActive: true,
    ppnPercent: "12",
    pph23Active: true,
    pph23Percent: "2",
    picOverrideActive: false,
    picOverrideName: null,
    picOverridePosition: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  } as QuotationRow;
}

function item(overrides: Partial<QuotationItemRow> = {}): QuotationItemRow {
  return {
    id: "item-1",
    quotationId: "quo-1",
    serviceId: "service-1",
    description: "Penyusunan Pertek Air Limbah",
    unitPrice: "75000000",
    quantity: "1",
    unit: "Paket",
    lineTotal: "75000000",
    sortOrder: 0,
    ...overrides,
  } as QuotationItemRow;
}

function rabPersonnel(overrides: Partial<RabPersonnelRow> = {}): RabPersonnelRow {
  return {
    id: "rab-p-1",
    quotationId: "quo-1",
    quotationItemId: "item-1",
    role: "Ketua Tim",
    volumeMonths: "2",
    unitPrice: "5000000",
    amount: "10000000",
    sortOrder: 0,
    ...overrides,
  } as RabPersonnelRow;
}

function rabDirectCost(overrides: Partial<RabDirectCostRow> = {}): RabDirectCostRow {
  return {
    id: "rab-d-1",
    quotationId: "quo-1",
    quotationItemId: "item-1",
    description: "Survey lapangan",
    amount: "2000000",
    sortOrder: 0,
    ...overrides,
  } as RabDirectCostRow;
}

function schedule(overrides: Partial<ScheduleRow> = {}): ScheduleRow {
  return {
    id: "sched-1",
    quotationId: "quo-1",
    quotationItemId: "item-1",
    numMonths: 2,
    ...overrides,
  } as ScheduleRow;
}

function scheduleRow(overrides: Partial<ScheduleRowRow> = {}): ScheduleRowRow {
  return {
    id: "row-1",
    scheduleId: "sched-1",
    activityName: "Survey Lapangan",
    sortOrder: 0,
    ...overrides,
  } as ScheduleRowRow;
}

function markedWeek(overrides: Partial<MarkedWeekRow> = {}): MarkedWeekRow {
  return {
    id: "mw-1",
    rowId: "row-1",
    weekNumber: 1,
    isActual: 0,
    ...overrides,
  } as MarkedWeekRow;
}

function baseInput(overrides: Partial<ToSphInput> = {}): ToSphInput {
  return {
    quotation: quotation(),
    companyName: "PT Contoh",
    companyAddress: "Jl. Contoh No. 1",
    termScheme: [],
    statusLabel: "Draft",
    items: [item()],
    rabPersonnel: [rabPersonnel()],
    rabDirectCosts: [rabDirectCost()],
    schedules: [schedule()],
    scheduleRows: [scheduleRow()],
    markedWeeks: [markedWeek()],
    ...overrides,
  };
}

describe("status enum <-> workflow_statuses.label", () => {
  it("round-trips every SphStatus through its label and back", () => {
    for (const [enumValue, label] of Object.entries(STATUS_LABEL_BY_ENUM)) {
      expect(ENUM_BY_STATUS_LABEL[label]).toBe(enumValue);
    }
  });
});

describe("toSph", () => {
  it("resolves status via statusLabel, falling back to 'draft' when unresolved", () => {
    expect(toSph(baseInput({ statusLabel: "Convert - Deal" })).status).toBe("deal");
    expect(toSph(baseInput({ statusLabel: null })).status).toBe("draft");
  });

  it("splits notes on newlines into catatan, and back to [] when null", () => {
    expect(toSph(baseInput()).catatan).toEqual(["Catatan satu", "Catatan dua"]);
    expect(toSph(baseInput({ quotation: quotation({ notes: null }) })).catatan).toEqual([]);
  });

  it("regroups RAB personnel/direct costs onto the matching item by quotationItemId", () => {
    const sph = toSph(baseInput());
    expect(sph.items).toHaveLength(1);
    expect(sph.items[0].rab.personil).toEqual([
      { uraian: "Ketua Tim", vol: 2, satuan: "bulan", hargaSatuan: 5_000_000 },
    ]);
    expect(sph.items[0].rab.langsung).toEqual([
      { uraian: "Survey lapangan", vol: 1, satuan: "paket", hargaSatuan: 2_000_000 },
    ]);
  });

  it("does not leak RAB rows across items", () => {
    const sph = toSph(
      baseInput({
        items: [item({ id: "item-1" }), item({ id: "item-2", description: "Dokumen AMDAL" })],
        rabPersonnel: [rabPersonnel({ quotationItemId: "item-1" })],
        rabDirectCosts: [],
        schedules: [],
        scheduleRows: [],
        markedWeeks: [],
      }),
    );
    expect(sph.items[0].rab.personil).toHaveLength(1);
    expect(sph.items[1].rab.personil).toHaveLength(0);
  });

  it("regroups jadwal (schedule + rows + marked weeks) onto the matching item", () => {
    const sph = toSph(baseInput());
    expect(sph.items[0].jadwal.bulan).toBe(2);
    expect(sph.items[0].jadwal.kegiatan).toEqual(["Survey Lapangan"]);
    expect(sph.items[0].jadwal.highlights).toEqual([[1]]);
  });

  it("defaults jadwal to an empty schedule when an item has no matching schedule row", () => {
    const sph = toSph(baseInput({ schedules: [], scheduleRows: [], markedWeeks: [] }));
    expect(sph.items[0].jadwal).toEqual({ kegiatan: [], highlights: [], bulan: 1 });
  });

  it("maps ppn/pph23 percent columns to numbers, defaulting when null", () => {
    expect(toSph(baseInput()).ppnPersen).toBe(12);
    expect(toSph(baseInput()).pph23Persen).toBe(2);
    const sph = toSph(baseInput({ quotation: quotation({ ppnPercent: null, pph23Percent: null }) }));
    expect(sph.ppnPersen).toBe(12);
    expect(sph.pph23Persen).toBe(2);
  });

  it("maps validityDays null to masaBerlakuAktif=false", () => {
    expect(toSph(baseInput()).masaBerlakuAktif).toBe(true);
    expect(toSph(baseInput({ quotation: quotation({ validityDays: null }) })).masaBerlakuAktif).toBe(false);
  });

  it("always returns an empty kelengkapan array (module stays out of scope)", () => {
    expect(toSph(baseInput()).kelengkapan).toEqual([]);
  });
});

describe("quotationColumnsFromInput", () => {
  it("joins catatan with newlines, storing null when empty", () => {
    expect(quotationColumnsFromInput({ catatan: ["a", "b"] }).notes).toBe("a\nb");
    expect(quotationColumnsFromInput({ catatan: [] }).notes).toBeNull();
  });

  it("nulls validityDays when masaBerlakuAktif is false, keeps the day count when true", () => {
    expect(quotationColumnsFromInput({ masaBerlakuAktif: false, masaBerlakuHari: 30 }).validityDays).toBeNull();
    expect(quotationColumnsFromInput({ masaBerlakuAktif: true, masaBerlakuHari: 14 }).validityDays).toBe(14);
  });

  it("only includes keys that were actually provided (partial update support)", () => {
    const result = quotationColumnsFromInput({ tanggal: "2026-06-01" });
    expect(result).toEqual({ date: "2026-06-01" });
  });
});
