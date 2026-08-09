import { eq, inArray } from "drizzle-orm";
import { withUserTransaction, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import { toProyekRab } from "@/lib/proyek/rab-mapping";
import type { ProyekRab, UpdateProyekRabInput } from "@/lib/schemas/proyek";

async function loadServiceNameForItem(tx: Tx, quotationItemId: string | null): Promise<string | null> {
  if (!quotationItemId) return null;
  const [item] = await tx.select({ serviceId: schema.quotationItems.serviceId }).from(schema.quotationItems).where(eq(schema.quotationItems.id, quotationItemId)).limit(1);
  if (!item?.serviceId) return null;
  const [svc] = await tx.select({ name: schema.serviceCatalog.name }).from(schema.serviceCatalog).where(eq(schema.serviceCatalog.id, item.serviceId)).limit(1);
  return svc?.name ?? null;
}

export async function getProjectRabEstimates(userId: string, projectId: string): Promise<ProyekRab[]> {
  return withUserTransaction(userId, async (tx) => {
    const estimates = await tx.select().from(schema.projectRabEstimates).where(eq(schema.projectRabEstimates.projectId, projectId));
    if (!estimates.length) return [];

    const estimateIds = estimates.map((e) => e.id);
    const allItems = await tx.select().from(schema.projectRabItems).where(inArray(schema.projectRabItems.estimateId, estimateIds));

    return Promise.all(
      estimates.map(async (estimate) => {
        const items = allItems.filter((i) => i.estimateId === estimate.id);
        const layananNama = await loadServiceNameForItem(tx, estimate.quotationItemId);
        return toProyekRab(estimate, layananNama, items);
      }),
    );
  });
}

async function insertItems(
  tx: Tx,
  estimateId: string,
  personil: { uraian: string; vol: number; satuan: string; hargaSatuan: number }[],
  langsung: { uraian: string; vol: number; satuan: string; hargaSatuan: number }[],
) {
  const rows = [
    ...personil.map((r, i) => ({ section: "personil", ...r, sortOrder: i })),
    ...langsung.map((r, i) => ({ section: "langsung", ...r, sortOrder: i })),
  ];
  if (!rows.length) return;
  await tx.insert(schema.projectRabItems).values(
    rows.map((r) => ({
      estimateId,
      section: r.section,
      uraian: r.uraian,
      volume: String(r.vol),
      unit: r.satuan || null,
      unitPrice: String(r.hargaSatuan),
      sortOrder: r.sortOrder,
    })),
  );
}

export async function updateProjectRabEstimate(
  userId: string,
  estimateId: string,
  input: UpdateProyekRabInput,
): Promise<ProyekRab> {
  return withUserTransaction(userId, async (tx) => {
    const [estimate] = await tx.select().from(schema.projectRabEstimates).where(eq(schema.projectRabEstimates.id, estimateId)).limit(1);
    if (!estimate) throw new NotFoundError("Estimasi RAB tidak ditemukan.");

    await tx.delete(schema.projectRabItems).where(eq(schema.projectRabItems.estimateId, estimateId));
    await insertItems(tx, estimateId, input.personil, input.langsung);

    const items = await tx.select().from(schema.projectRabItems).where(eq(schema.projectRabItems.estimateId, estimateId));
    const layananNama = await loadServiceNameForItem(tx, estimate.quotationItemId);
    return toProyekRab(estimate, layananNama, items);
  });
}

/** The Deal-time hand-off — one-time copy of each SPH item's RAB
 * (quotation_rab_personnel/quotation_rab_direct_costs) into a fresh
 * project_rab_estimates/project_rab_items record, one estimate per item that
 * actually has RAB rows. Runs inside the caller's transaction (createProyek). */
export async function cloneQuotationRabToProject(tx: Tx, quotationId: string, projectId: string): Promise<void> {
  const personnel = await tx.select().from(schema.quotationRabPersonnel).where(eq(schema.quotationRabPersonnel.quotationId, quotationId));
  const directCosts = await tx.select().from(schema.quotationRabDirectCosts).where(eq(schema.quotationRabDirectCosts.quotationId, quotationId));
  if (!personnel.length && !directCosts.length) return;

  const itemIds = [...new Set([...personnel.map((p) => p.quotationItemId), ...directCosts.map((d) => d.quotationItemId)])];

  for (const itemId of itemIds) {
    const [estimate] = await tx
      .insert(schema.projectRabEstimates)
      .values({ projectId, quotationItemId: itemId })
      .returning();

    const itemPersonnel = personnel
      .filter((p) => p.quotationItemId === itemId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((p) => ({ section: "personil", uraian: p.role, volume: p.volumeMonths, unit: "Bln", unitPrice: p.unitPrice, sortOrder: p.sortOrder }));
    const itemDirect = directCosts
      .filter((d) => d.quotationItemId === itemId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((d) => ({ section: "langsung", uraian: d.description, volume: "1", unit: "Ls", unitPrice: d.amount, sortOrder: d.sortOrder }));

    const rows = [...itemPersonnel, ...itemDirect];
    if (rows.length) {
      await tx.insert(schema.projectRabItems).values(rows.map((r) => ({ ...r, estimateId: estimate.id })));
    }
  }
}
