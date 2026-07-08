import { describe, it, expect } from "vitest";
import { DOC_TYPE_APP_TO_DB, DOC_TYPE_DB_TO_APP } from "@/lib/pengiriman/enum-map";
import {
  resolveOwnerColumn,
  ownerFields,
  toDbDocType,
  toPengirimanLog,
  type DeliveryRow,
} from "@/lib/pengiriman/mapping";

describe("DOC_TYPE_APP_TO_DB / DOC_TYPE_DB_TO_APP", () => {
  it("round-trips every document type", () => {
    for (const [app, db] of Object.entries(DOC_TYPE_APP_TO_DB)) {
      expect(DOC_TYPE_DB_TO_APP[db]).toBe(app);
    }
  });
});

describe("resolveOwnerColumn / ownerFields", () => {
  it("maps sph to quotationId", () => {
    expect(resolveOwnerColumn("sph")).toBe("quotationId");
    expect(ownerFields("sph", "q-1")).toEqual({ quotationId: "q-1" });
  });

  it("maps faktur to installmentInvoiceId", () => {
    expect(resolveOwnerColumn("faktur")).toBe("installmentInvoiceId");
    expect(ownerFields("faktur", "inv-1")).toEqual({ installmentInvoiceId: "inv-1" });
  });

  it("maps slip to payslipId", () => {
    expect(resolveOwnerColumn("slip")).toBe("payslipId");
    expect(ownerFields("slip", "ps-1")).toEqual({ payslipId: "ps-1" });
  });
});

describe("toDbDocType", () => {
  it("translates app enum to DB enum", () => {
    expect(toDbDocType("sph")).toBe("sph");
    expect(toDbDocType("faktur")).toBe("invoice");
    expect(toDbDocType("slip")).toBe("slip_gaji");
  });
});

function deliveryRow(overrides: Partial<DeliveryRow> = {}): DeliveryRow {
  return {
    id: "del-1",
    channel: "email",
    documentType: "sph",
    quotationId: "q-1",
    installmentInvoiceId: null,
    payslipId: null,
    documentNumber: "SPH/001/1.2026",
    recipientName: "Budi Santoso",
    recipientContact: "budi@contoh.co.id",
    status: "sent",
    error: null,
    sentAt: new Date("2026-01-05T10:00:00Z"),
    createdAt: new Date("2026-01-05T09:00:00Z"),
    ...overrides,
  };
}

describe("toPengirimanLog", () => {
  it("maps a quotation-owned row, translating the document type", () => {
    const log = toPengirimanLog(deliveryRow());
    expect(log.jenisDokumen).toBe("sph");
    expect(log.dokumenId).toBe("q-1");
    expect(log.dokumenNomor).toBe("SPH/001/1.2026");
    expect(log.status).toBe("sent");
    expect(log.timestamp).toBe("2026-01-05T10:00:00.000Z");
  });

  it("maps an installment-invoice-owned row", () => {
    const log = toPengirimanLog(
      deliveryRow({ documentType: "invoice", quotationId: null, installmentInvoiceId: "inv-1" }),
    );
    expect(log.jenisDokumen).toBe("faktur");
    expect(log.dokumenId).toBe("inv-1");
  });

  it("maps a payslip-owned row", () => {
    const log = toPengirimanLog(
      deliveryRow({ documentType: "slip_gaji", quotationId: null, payslipId: "ps-1" }),
    );
    expect(log.jenisDokumen).toBe("slip");
    expect(log.dokumenId).toBe("ps-1");
  });

  it("falls back to createdAt when sentAt is null (queued/failed rows)", () => {
    const log = toPengirimanLog(deliveryRow({ status: "queued", sentAt: null }));
    expect(log.timestamp).toBe("2026-01-05T09:00:00.000Z");
  });

  it("carries the error message through for failed rows", () => {
    const log = toPengirimanLog(deliveryRow({ status: "failed", sentAt: null, error: "SMTP timeout" }));
    expect(log.status).toBe("failed");
    expect(log.error).toBe("SMTP timeout");
  });
});
