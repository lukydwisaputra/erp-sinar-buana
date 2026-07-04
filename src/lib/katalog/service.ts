import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { withUserTransaction, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import { toLayanan, type ServiceRow, type DocumentTypeRow, type AuthorityRow, type LegalBasisRow } from "@/lib/katalog/mapping";
import type { Layanan, CreateLayananInput, UpdateLayananInput } from "@/lib/schemas/katalog";

export { toLayanan, computeMetrik } from "@/lib/katalog/mapping";

async function loadRefs(tx: Tx, rows: ServiceRow[]) {
  const documentTypeIds = [...new Set(rows.map((r) => r.documentTypeId).filter((x): x is string => !!x))];
  const authorityIds = [...new Set(rows.map((r) => r.authorityId).filter((x): x is string => !!x))];
  const legalBasisIds = [...new Set(rows.map((r) => r.legalBasisId).filter((x): x is string => !!x))];
  const documentTypeRows = documentTypeIds.length
    ? await tx.select().from(schema.documentTypes).where(inArray(schema.documentTypes.id, documentTypeIds))
    : [];
  const authorityRows = authorityIds.length
    ? await tx.select().from(schema.authorities).where(inArray(schema.authorities.id, authorityIds))
    : [];
  const legalBasisRows = legalBasisIds.length
    ? await tx.select().from(schema.legalBases).where(inArray(schema.legalBases.id, legalBasisIds))
    : [];
  return {
    documentTypesById: new Map(documentTypeRows.map((d) => [d.id, d])),
    authoritiesById: new Map(authorityRows.map((a) => [a.id, a])),
    legalBasesById: new Map(legalBasisRows.map((l) => [l.id, l])),
  };
}

function refFor(
  row: ServiceRow,
  documentTypesById: Map<string, DocumentTypeRow>,
  authoritiesById: Map<string, AuthorityRow>,
  legalBasesById: Map<string, LegalBasisRow>,
) {
  return {
    documentType: row.documentTypeId ? documentTypesById.get(row.documentTypeId) : undefined,
    authority: row.authorityId ? authoritiesById.get(row.authorityId) : undefined,
    legalBasis: row.legalBasisId ? legalBasesById.get(row.legalBasisId) : undefined,
  };
}

export async function listServices(userId: string): Promise<Layanan[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.serviceCatalog)
      .where(isNull(schema.serviceCatalog.deletedAt))
      .orderBy(desc(schema.serviceCatalog.createdAt));
    const { documentTypesById, authoritiesById, legalBasesById } = await loadRefs(tx, rows);
    return rows.map((row) => {
      const { documentType, authority, legalBasis } = refFor(row, documentTypesById, authoritiesById, legalBasesById);
      return toLayanan(row, documentType, authority, legalBasis);
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
    const { documentTypesById, authoritiesById, legalBasesById } = await loadRefs(tx, [row]);
    const { documentType, authority, legalBasis } = refFor(row, documentTypesById, authoritiesById, legalBasesById);
    return toLayanan(row, documentType, authority, legalBasis);
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
        isRecurring: input.isRecurring ?? false,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();
    const { documentTypesById, authoritiesById, legalBasesById } = await loadRefs(tx, [row]);
    const { documentType, authority, legalBasis } = refFor(row, documentTypesById, authoritiesById, legalBasesById);
    return toLayanan(row, documentType, authority, legalBasis);
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
        ...(input.isRecurring !== undefined && { isRecurring: input.isRecurring }),
        ...(input.status !== undefined && { isActive: input.status === "aktif" }),
        updatedBy: userId,
      })
      .where(eq(schema.serviceCatalog.id, id))
      .returning();

    const { documentTypesById, authoritiesById, legalBasesById } = await loadRefs(tx, [row]);
    const { documentType, authority, legalBasis } = refFor(row, documentTypesById, authoritiesById, legalBasesById);
    return toLayanan(row, documentType, authority, legalBasis);
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
