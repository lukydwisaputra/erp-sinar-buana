/**
 * Pure DB-row <-> app-shape mapping for Katalog Layanan, kept free of any DB
 * connection import so these functions stay unit-testable without a live
 * Postgres — see `src/lib/katalog/service.ts` for the actual queries.
 */
import { proyekFixtures } from "@/lib/fixtures/proyek";
import type { serviceCatalog, documentTypes, authorities, legalBases } from "@/lib/db/schema";
import type { Layanan } from "@/lib/schemas/katalog";

export type ServiceRow = typeof serviceCatalog.$inferSelect;
export type DocumentTypeRow = typeof documentTypes.$inferSelect;
export type AuthorityRow = typeof authorities.$inferSelect;
export type LegalBasisRow = typeof legalBases.$inferSelect;

// Proyek isn't wired to the real backend yet, so `dipakaiProyek` keeps
// cross-referencing its mock fixtures by service name. `dipakaiSPH` is now a
// real count (Penawaran is wired, quotation_items.service_id references this
// row directly) — see src/lib/katalog/service.ts, which queries it and
// passes it in here rather than name-matching a frozen mock array.
export function computeMetrik(nama: string, dipakaiSPH: number): Layanan["metrik"] {
  const dipakaiProyek = proyekFixtures.filter((p) => p.layananNama.includes(nama)).length;
  return { dipakaiSPH, dipakaiProyek };
}

export function toLayanan(
  service: ServiceRow,
  documentType: DocumentTypeRow | undefined,
  authority: AuthorityRow | undefined,
  legalBasis: LegalBasisRow | undefined,
  dipakaiSPH: number,
): Layanan {
  return {
    id: service.id,
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
    metrik: computeMetrik(service.name, dipakaiSPH),
  };
}
