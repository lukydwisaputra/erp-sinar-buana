/**
 * Pure DB-row <-> app-shape mapping for Katalog Layanan, kept free of any DB
 * connection import so these functions stay unit-testable without a live
 * Postgres — see `src/lib/katalog/service.ts` for the actual queries.
 */
import type { serviceCatalog, documentTypes, authorities, legalBases, milestoneTemplates } from "@/lib/db/schema";
import type { Layanan } from "@/lib/schemas/katalog";

export type ServiceRow = typeof serviceCatalog.$inferSelect;
export type DocumentTypeRow = typeof documentTypes.$inferSelect;
export type AuthorityRow = typeof authorities.$inferSelect;
export type LegalBasisRow = typeof legalBases.$inferSelect;
export type MilestoneTemplateRow = typeof milestoneTemplates.$inferSelect;

// `dipakaiSPH`/`dipakaiProyek` are both real counts now (Penawaran and
// Proyek are wired) — see src/lib/katalog/service.ts, which queries them via
// quotation_items.service_id / project_services.service_id and passes them
// in here rather than name-matching a frozen mock array.
export function computeMetrik(dipakaiSPH: number, dipakaiProyek: number): Layanan["metrik"] {
  return { dipakaiSPH, dipakaiProyek };
}

export function toLayanan(
  service: ServiceRow,
  documentType: DocumentTypeRow | undefined,
  authority: AuthorityRow | undefined,
  legalBasis: LegalBasisRow | undefined,
  milestoneTemplate: MilestoneTemplateRow | undefined,
  dipakaiSPH: number,
  dipakaiProyek: number,
): Layanan {
  return {
    id: service.id,
    number: service.number,
    nama: service.name,
    documentTypeId: service.documentTypeId,
    jenisDokumen: documentType?.label ?? "—",
    authorityId: service.authorityId,
    kewenangan: authority?.label ?? "—",
    legalBasisId: service.legalBasisId,
    dasarHukum: legalBasis?.label ?? null,
    hargaStandar: service.standardPrice !== null ? Number(service.standardPrice) : null,
    isRecurring: service.isRecurring,
    status: service.isActive ? "aktif" : "terarsip",
    milestoneTemplateId: service.milestoneTemplateId,
    milestoneTemplateNama: milestoneTemplate?.name ?? null,
    metrik: computeMetrik(dipakaiSPH, dipakaiProyek),
  };
}
