import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { schema } from "@/lib/db/client";
import type { Tx } from "@/lib/db/tx";
import { NotFoundError, ConflictError } from "@/lib/api-error";

/**
 * Shared `workflow_statuses` lookups for entities that are config-driven
 * end-to-end (no app-side enum to translate to/from, unlike Penawaran's
 * STATUS_LABEL_BY_ENUM) — status IS whatever's configured in Konfigurasi.
 */

export type WorkflowStatusEntity = "proyek" | "milestone" | "faktur" | "penggajian";

export async function listWorkflowStatuses(tx: Tx, entity: WorkflowStatusEntity) {
  return tx
    .select()
    .from(schema.workflowStatuses)
    .where(and(eq(schema.workflowStatuses.entity, entity), eq(schema.workflowStatuses.isActive, true)))
    .orderBy(schema.workflowStatuses.sortOrder);
}

export async function getDefaultStatusId(tx: Tx, entity: WorkflowStatusEntity): Promise<string> {
  const [row] = await tx
    .select({ id: schema.workflowStatuses.id })
    .from(schema.workflowStatuses)
    .where(and(eq(schema.workflowStatuses.entity, entity), eq(schema.workflowStatuses.isDefault, true)))
    .limit(1);
  if (!row) throw new NotFoundError(`Belum ada status default untuk "${entity}" — jalankan seed data.`);
  return row.id;
}

export async function loadStatusLabel(tx: Tx, statusId: string | null): Promise<string | null> {
  if (!statusId) return null;
  const [row] = await tx
    .select({ label: schema.workflowStatuses.label })
    .from(schema.workflowStatuses)
    .where(eq(schema.workflowStatuses.id, statusId))
    .limit(1);
  return row?.label ?? null;
}

/** Label + system_role in one query — automation should key off
 * `systemRole`, never the label (clients rename/reorder labels freely). */
export async function loadStatus(tx: Tx, statusId: string | null): Promise<{ label: string; systemRole: string | null } | null> {
  if (!statusId) return null;
  const [row] = await tx
    .select({ label: schema.workflowStatuses.label, systemRole: schema.workflowStatuses.systemRole })
    .from(schema.workflowStatuses)
    .where(eq(schema.workflowStatuses.id, statusId))
    .limit(1);
  return row ?? null;
}

/** Batched version for regrouping many rows (e.g. every milestone's statusId
 * in one project) without one query per row. */
export async function loadStatusLabelsByIds(tx: Tx, statusIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(statusIds)];
  if (!ids.length) return new Map();
  const rows = await tx
    .select({ id: schema.workflowStatuses.id, label: schema.workflowStatuses.label })
    .from(schema.workflowStatuses)
    .where(inArray(schema.workflowStatuses.id, ids));
  return new Map(rows.map((r) => [r.id, r.label]));
}

// ── Konfigurasi admin management (Workflow Status tab) ──────────────────────
// Everything below backs the real CRUD for this entity's rows. `penawaran` is
// deliberately never passed in here from the admin UI — its status display
// still keys off a hardcoded label dictionary (src/lib/penawaran/mapping.ts's
// STATUS_LABEL_BY_ENUM), so free-label rename/delete would silently break it.

export type WorkflowStatusRow = typeof schema.workflowStatuses.$inferSelect;

/** Admin view — includes inactive rows so Admin can see + reactivate them,
 * unlike `listWorkflowStatuses` (active-only, for live dropdowns). */
export async function listAllForEntity(tx: Tx, entity: WorkflowStatusEntity): Promise<WorkflowStatusRow[]> {
  return tx
    .select()
    .from(schema.workflowStatuses)
    .where(eq(schema.workflowStatuses.entity, entity))
    .orderBy(asc(schema.workflowStatuses.sortOrder));
}

export async function createStatus(
  tx: Tx,
  entity: WorkflowStatusEntity,
  label: string,
): Promise<WorkflowStatusRow> {
  const [maxRow] = await tx
    .select({ sortOrder: schema.workflowStatuses.sortOrder })
    .from(schema.workflowStatuses)
    .where(eq(schema.workflowStatuses.entity, entity))
    .orderBy(desc(schema.workflowStatuses.sortOrder))
    .limit(1);
  const [row] = await tx
    .insert(schema.workflowStatuses)
    .values({
      entity,
      label,
      sortOrder: (maxRow?.sortOrder ?? 0) + 1,
      isActive: true,
      isSystem: false,
      systemRole: null,
    })
    .returning();
  return row;
}

async function getStatusRow(tx: Tx, id: string): Promise<WorkflowStatusRow> {
  const [row] = await tx
    .select()
    .from(schema.workflowStatuses)
    .where(eq(schema.workflowStatuses.id, id))
    .limit(1);
  if (!row) throw new NotFoundError("Status tidak ditemukan.");
  return row;
}

/** US-00.2 scenario 3 (mock precedent): prevent clearing/reassigning the
 * last active status holding a given role, since automation would then have
 * nowhere to route it. */
async function assertRoleReassignable(
  tx: Tx,
  row: WorkflowStatusRow,
): Promise<void> {
  if (!row.systemRole) return;
  const [other] = await tx
    .select({ id: schema.workflowStatuses.id })
    .from(schema.workflowStatuses)
    .where(and(
      eq(schema.workflowStatuses.entity, row.entity),
      eq(schema.workflowStatuses.systemRole, row.systemRole),
      eq(schema.workflowStatuses.isActive, true),
      ne(schema.workflowStatuses.id, row.id),
    ))
    .limit(1);
  if (!other) {
    throw new ConflictError(
      `Peran ${row.systemRole} sedang dipakai otomasi — tetapkan pengganti terlebih dahulu.`,
    );
  }
}

export async function updateStatus(
  tx: Tx,
  id: string,
  patch: { label?: string; systemRole?: WorkflowStatusRow["systemRole"]; isActive?: boolean },
): Promise<WorkflowStatusRow> {
  const existing = await getStatusRow(tx, id);
  const deactivating = patch.isActive === false && existing.isActive;
  // The default status is assigned to every new document of this entity
  // (getDefaultStatusId) — deactivating it would break document creation
  // entirely, and there's no UI here to reassign which row is default.
  if (deactivating && existing.isDefault) {
    throw new ConflictError("Status default tidak dapat dinonaktifkan.");
  }
  const clearingRole = patch.systemRole !== undefined && patch.systemRole !== existing.systemRole;
  if (clearingRole || deactivating) await assertRoleReassignable(tx, existing);

  const [row] = await tx
    .update(schema.workflowStatuses)
    .set({
      ...(patch.label !== undefined && { label: patch.label }),
      ...(patch.systemRole !== undefined && { systemRole: patch.systemRole }),
      ...(patch.isActive !== undefined && { isActive: patch.isActive }),
      updatedAt: new Date(),
    })
    .where(eq(schema.workflowStatuses.id, id))
    .returning();
  return row;
}

export async function deleteStatus(tx: Tx, id: string): Promise<void> {
  const existing = await getStatusRow(tx, id);
  if (existing.isSystem) throw new ConflictError("Status sistem tidak dapat dihapus.");
  await tx.delete(schema.workflowStatuses).where(eq(schema.workflowStatuses.id, id));
}

export async function moveStatus(
  tx: Tx,
  id: string,
  direction: "up" | "down",
): Promise<WorkflowStatusRow[]> {
  const existing = await getStatusRow(tx, id);
  const siblings = await tx
    .select()
    .from(schema.workflowStatuses)
    .where(eq(schema.workflowStatuses.entity, existing.entity))
    .orderBy(asc(schema.workflowStatuses.sortOrder));
  const idx = siblings.findIndex((s) => s.id === id);
  const swapIdx = direction === "up" ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= siblings.length) return siblings;
  const a = siblings[idx];
  const b = siblings[swapIdx];
  await tx.update(schema.workflowStatuses).set({ sortOrder: b.sortOrder }).where(eq(schema.workflowStatuses.id, a.id));
  await tx.update(schema.workflowStatuses).set({ sortOrder: a.sortOrder }).where(eq(schema.workflowStatuses.id, b.id));
  [siblings[idx].sortOrder, siblings[swapIdx].sortOrder] = [b.sortOrder, a.sortOrder];
  return [...siblings].sort((x, y) => x.sortOrder - y.sortOrder);
}
