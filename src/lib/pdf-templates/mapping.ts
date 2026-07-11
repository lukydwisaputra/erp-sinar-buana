/**
 * Pure DB-row <-> app-shape mapping for PDF templates, kept free of any DB
 * connection import so this stays unit-testable without a live Postgres —
 * see `src/lib/pdf-templates/service.ts` for the actual queries.
 */
import type { pdfTemplates } from "@/lib/db/schema";
import type { PdfTemplate } from "@/lib/schemas/pdf-templates";

export type PdfTemplateRow = typeof pdfTemplates.$inferSelect;

export function toPdfTemplate(row: PdfTemplateRow): PdfTemplate {
  return {
    id: row.id,
    nama: row.name,
    documentType: row.documentType,
    headerNote: row.headerNote,
    footerNote: row.footerNote,
    isActive: row.isActive,
  };
}
