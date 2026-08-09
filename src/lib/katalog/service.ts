import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { withUserTransaction, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import {
  toLayanan, type ServiceRow, type DocumentTypeRow, type AuthorityRow, type LegalBasisRow, type MilestoneTemplateRow,
} from "@/lib/katalog/mapping";
import type { Layanan, CreateLayananInput, UpdateLayananInput } from "@/lib/schemas/katalog";

export { toLayanan, computeMetrik } from "@/lib/katalog/mapping";

async function loadRefs(tx: Tx, rows: ServiceRow[]) {
  const documentTypeIds = [...new Set(rows.map((r) => r.documentTypeId).filter((x): x is string => !!x))];
  const authorityIds = [...new Set(rows.map((r) => r.authorityId).filter((x): x is string => !!x))];
  const legalBasisIds = [...new Set(rows.map((r) => r.legalBasisId).filter((x): x is string => !!x))];
  const milestoneTemplateIds = [...new Set(rows.map((r) => r.milestoneTemplateId).filter((x): x is string => !!x))];
  const documentTypeRows = documentTypeIds.length
    ? await tx.select().from(schema.documentTypes).where(inArray(schema.documentTypes.id, documentTypeIds))
    : [];
  const authorityRows = authorityIds.length
    ? await tx.select().from(schema.authorities).where(inArray(schema.authorities.id, authorityIds))
    : [];
  const legalBasisRows = legalBasisIds.length
    ? await tx.select().from(schema.legalBases).where(inArray(schema.legalBases.id, legalBasisIds))
    : [];
  const milestoneTemplateRows = milestoneTemplateIds.length
    ? await tx.select().from(schema.milestoneTemplates).where(inArray(schema.milestoneTemplates.id, milestoneTemplateIds))
    : [];
  return {
    documentTypesById: new Map(documentTypeRows.map((d) => [d.id, d])),
    authoritiesById: new Map(authorityRows.map((a) => [a.id, a])),
    legalBasesById: new Map(legalBasisRows.map((l) => [l.id, l])),
    milestoneTemplatesById: new Map(milestoneTemplateRows.map((m) => [m.id, m])),
  };
}

function refFor(
  row: ServiceRow,
  documentTypesById: Map<string, DocumentTypeRow>,
  authoritiesById: Map<string, AuthorityRow>,
  legalBasesById: Map<string, LegalBasisRow>,
  milestoneTemplatesById: Map<string, MilestoneTemplateRow>,
) {
  return {
    documentType: row.documentTypeId ? documentTypesById.get(row.documentTypeId) : undefined,
    authority: row.authorityId ? authoritiesById.get(row.authorityId) : undefined,
    legalBasis: row.legalBasisId ? legalBasesById.get(row.legalBasisId) : undefined,
    milestoneTemplate: row.milestoneTemplateId ? milestoneTemplatesById.get(row.milestoneTemplateId) : undefined,
  };
}

/** Real count of (non-deleted) quotation_items per service — Penawaran is
 * wired, so `dipakaiSPH` no longer name-matches a frozen mock fixture array. */
async function countUsageByService(tx: Tx, serviceIds: string[]): Promise<Map<string, number>> {
  if (!serviceIds.length) return new Map();
  const rows = await tx
    .select({ serviceId: schema.quotationItems.serviceId, count: sql<number>`count(*)::int` })
    .from(schema.quotationItems)
    .innerJoin(schema.quotations, eq(schema.quotationItems.quotationId, schema.quotations.id))
    .where(and(inArray(schema.quotationItems.serviceId, serviceIds), isNull(schema.quotations.deletedAt)))
    .groupBy(schema.quotationItems.serviceId);
  return new Map(rows.filter((r) => r.serviceId !== null).map((r) => [r.serviceId as string, r.count]));
}

/** Real count of (non-deleted) project_services per service — Proyek is
 * wired, so `dipakaiProyek` no longer name-matches a frozen mock fixture array. */
async function countProjectUsageByService(tx: Tx, serviceIds: string[]): Promise<Map<string, number>> {
  if (!serviceIds.length) return new Map();
  const rows = await tx
    .select({ serviceId: schema.projectServices.serviceId, count: sql<number>`count(*)::int` })
    .from(schema.projectServices)
    .innerJoin(schema.projects, eq(schema.projectServices.projectId, schema.projects.id))
    .where(and(inArray(schema.projectServices.serviceId, serviceIds), isNull(schema.projects.deletedAt)))
    .groupBy(schema.projectServices.serviceId);
  return new Map(rows.filter((r) => r.serviceId !== null).map((r) => [r.serviceId as string, r.count]));
}

export async function listServices(userId: string): Promise<Layanan[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.serviceCatalog)
      .where(isNull(schema.serviceCatalog.deletedAt))
      .orderBy(desc(schema.serviceCatalog.createdAt));
    const { documentTypesById, authoritiesById, legalBasesById, milestoneTemplatesById } = await loadRefs(tx, rows);
    const serviceIds = rows.map((r) => r.id);
    const [usageCounts, projectCounts] = await Promise.all([
      countUsageByService(tx, serviceIds),
      countProjectUsageByService(tx, serviceIds),
    ]);
    return rows.map((row) => {
      const { documentType, authority, legalBasis, milestoneTemplate } = refFor(row, documentTypesById, authoritiesById, legalBasesById, milestoneTemplatesById);
      return toLayanan(row, documentType, authority, legalBasis, milestoneTemplate, usageCounts.get(row.id) ?? 0, projectCounts.get(row.id) ?? 0);
    });
  });
}

export async function getService(userId: string, id: string): Promise<Layanan> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .select()
      .from(schema.serviceCatalog)
      .where(and(eq(schema.serviceCatalog.id, id), isNull(schema.serviceCatalog.deletedAt)))
      .limit(1);
    if (!row) throw new NotFoundError("Layanan tidak ditemukan.");
    const { documentTypesById, authoritiesById, legalBasesById, milestoneTemplatesById } = await loadRefs(tx, [row]);
    const { documentType, authority, legalBasis, milestoneTemplate } = refFor(row, documentTypesById, authoritiesById, legalBasesById, milestoneTemplatesById);
    const [usageCounts, projectCounts] = await Promise.all([
      countUsageByService(tx, [id]),
      countProjectUsageByService(tx, [id]),
    ]);
    return toLayanan(row, documentType, authority, legalBasis, milestoneTemplate, usageCounts.get(id) ?? 0, projectCounts.get(id) ?? 0);
  });
}

export async function createService(userId: string, input: CreateLayananInput): Promise<Layanan> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .insert(schema.serviceCatalog)
      .values({
        name: input.nama,
        documentTypeId: input.documentTypeId,
        authorityId: input.authorityId,
        legalBasisId: input.legalBasisId || null,
        standardPrice: input.hargaStandar != null ? String(input.hargaStandar) : null,
        milestoneTemplateId: input.milestoneTemplateId || null,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();
    const { documentTypesById, authoritiesById, legalBasesById, milestoneTemplatesById } = await loadRefs(tx, [row]);
    const { documentType, authority, legalBasis, milestoneTemplate } = refFor(row, documentTypesById, authoritiesById, legalBasesById, milestoneTemplatesById);
    return toLayanan(row, documentType, authority, legalBasis, milestoneTemplate, 0, 0);
  });
}

export async function updateService(
  userId: string,
  id: string,
  input: UpdateLayananInput,
): Promise<Layanan> {
  return withUserTransaction(userId, async (tx) => {
    const [existing] = await tx
      .select({ id: schema.serviceCatalog.id })
      .from(schema.serviceCatalog)
      .where(and(eq(schema.serviceCatalog.id, id), isNull(schema.serviceCatalog.deletedAt)))
      .limit(1);
    if (!existing) throw new NotFoundError("Layanan tidak ditemukan.");

    const [row] = await tx
      .update(schema.serviceCatalog)
      .set({
        ...(input.nama !== undefined && { name: input.nama }),
        ...(input.documentTypeId !== undefined && { documentTypeId: input.documentTypeId }),
        ...(input.authorityId !== undefined && { authorityId: input.authorityId }),
        ...(input.legalBasisId !== undefined && { legalBasisId: input.legalBasisId || null }),
        ...(input.hargaStandar !== undefined && { standardPrice: input.hargaStandar != null ? String(input.hargaStandar) : null }),
        ...(input.status !== undefined && { isActive: input.status === "aktif" }),
        ...(input.milestoneTemplateId !== undefined && { milestoneTemplateId: input.milestoneTemplateId || null }),
        updatedBy: userId,
      })
      .where(eq(schema.serviceCatalog.id, id))
      .returning();

    const { documentTypesById, authoritiesById, legalBasesById, milestoneTemplatesById } = await loadRefs(tx, [row]);
    const { documentType, authority, legalBasis, milestoneTemplate } = refFor(row, documentTypesById, authoritiesById, legalBasesById, milestoneTemplatesById);
    const [usageCounts, projectCounts] = await Promise.all([
      countUsageByService(tx, [id]),
      countProjectUsageByService(tx, [id]),
    ]);
    return toLayanan(row, documentType, authority, legalBasis, milestoneTemplate, usageCounts.get(id) ?? 0, projectCounts.get(id) ?? 0);
  });
}

export async function deleteService(userId: string, id: string): Promise<void> {
  await withUserTransaction(userId, async (tx) => {
    const [existing] = await tx
      .select({ id: schema.serviceCatalog.id })
      .from(schema.serviceCatalog)
      .where(and(eq(schema.serviceCatalog.id, id), isNull(schema.serviceCatalog.deletedAt)))
      .limit(1);
    if (!existing) throw new NotFoundError("Layanan tidak ditemukan.");
    await tx
      .update(schema.serviceCatalog)
      .set({ deletedAt: new Date(), deletedBy: userId })
      .where(eq(schema.serviceCatalog.id, id));
  });
}
