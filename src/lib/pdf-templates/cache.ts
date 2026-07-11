import type { PdfTemplate, PdfTemplateDocumentType } from "@/lib/schemas/pdf-templates";

type Notes = { headerNote: string; footerNote: string };

const EMPTY: Notes = { headerNote: "", footerNote: "" };

/** Same synchronous-cache pattern as `company-profile/cache.ts` — printed
 * documents (SPH/Faktur/Slip) render deep with no props/loading state, so
 * this singleton is kept fresh from a single point in the persistent app
 * shell (`src/components/shell/app-sidebar.tsx`) rather than prop-drilled. */
export const pdfTemplateNotesCache: { current: Record<PdfTemplateDocumentType, Notes> } = {
  current: { sph: EMPTY, invoice: EMPTY, slip_gaji: EMPTY },
};

/** One template "in effect" per documentType — the most recently created
 * active one. No admin UI exists yet to pick a default when several active
 * templates share a type; this is a documented, deliberate simplification. */
export function pickActiveNotes(templates: PdfTemplate[]): Record<PdfTemplateDocumentType, Notes> {
  const result: Record<PdfTemplateDocumentType, Notes> = { sph: EMPTY, invoice: EMPTY, slip_gaji: EMPTY };
  for (const t of templates) {
    if (!t.isActive) continue;
    if (result[t.documentType] !== EMPTY) continue; // already found (list is createdAt desc)
    result[t.documentType] = { headerNote: t.headerNote, footerNote: t.footerNote };
  }
  return result;
}
