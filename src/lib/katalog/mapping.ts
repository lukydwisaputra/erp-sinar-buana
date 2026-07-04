/**
 * Pure DB-row <-> app-shape mapping for Katalog Layanan, kept free of any DB
 * connection import so these functions stay unit-testable without a live
 * Postgres — see `src/lib/katalog/service.ts` for the actual queries.
 */
import { penawaranFixtures } from "@/lib/fixtures/penawaran";
import { proyekFixtures } from "@/lib/fixtures/proyek";
import type { serviceCatalog, documentTypes, authorities, legalBases } from "@/lib/db/schema";
import type { Layanan } from "@/lib/schemas/katalog";

export type ServiceRow = typeof serviceCatalog.$inferSelect;
export type DocumentTypeRow = typeof documentTypes.$inferSelect;
export type AuthorityRow = typeof authorities.$inferSelect;
export type LegalBasisRow = typeof legalBases.$inferSelect;

// Penawaran/Proyek aren't wired to the real backend yet, so `metrik` keeps
// cross-referencing their mock fixtures by service **name** (not id) — this
// mirrors the exact matching logic the old src/lib/data/katalog.ts used.
export function computeMetrik(nama: string): Layanan["metrik"] {
  const dipakaiSPH = penawaranFixtures.filter((s) => s.items.some((i) => i.nama === nama)).length;
  const dipakaiProyek = proyekFixtures.filter((p) => p.layananNama.includes(nama)).length;
  return { dipakaiSPH, dipakaiProyek };
}

export function toLayanan(
  service: ServiceRow,
  documentType: DocumentTypeRow | undefined,
  authority: AuthorityRow | undefined,
  legalBasis: LegalBasisRow | undefined,
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
    metrik: computeMetrik(service.name),
  };
}
