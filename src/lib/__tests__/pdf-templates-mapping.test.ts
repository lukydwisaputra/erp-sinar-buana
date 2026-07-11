import { describe, expect, it } from "vitest";
import { toPdfTemplate } from "@/lib/pdf-templates/mapping";
import type { PdfTemplateRow } from "@/lib/pdf-templates/mapping";

function row(overrides: Partial<PdfTemplateRow> = {}): PdfTemplateRow {
  return {
    id: "tpl-1", name: "Template Invoice Standar", documentType: "invoice",
    headerNote: "Mohon melakukan pembayaran.", footerNote: "Terima kasih.",
    isActive: true, createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

describe("toPdfTemplate", () => {
  it("passes fields through unchanged", () => {
    const result = toPdfTemplate(row());
    expect(result).toEqual({
      id: "tpl-1",
      nama: "Template Invoice Standar",
      documentType: "invoice",
      headerNote: "Mohon melakukan pembayaran.",
      footerNote: "Terima kasih.",
      isActive: true,
    });
  });
});
