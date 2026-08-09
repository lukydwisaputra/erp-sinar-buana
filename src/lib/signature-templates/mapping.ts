/**
 * Pure DB-row <-> app-shape mapping for signature templates, kept free of any
 * DB connection import so this stays unit-testable without a live Postgres —
 * see `src/lib/signature-templates/service.ts` for the actual queries.
 */
import type { signatureTemplates } from "@/lib/db/schema";
import type { SignatureTemplate } from "@/lib/schemas/signature-templates";

export type SignatureTemplateRow = typeof signatureTemplates.$inferSelect;

export function toSignatureTemplate(row: SignatureTemplateRow): SignatureTemplate {
  return {
    id: row.id,
    nama: row.name,
    signatureImage: row.signatureImage,
  };
}
