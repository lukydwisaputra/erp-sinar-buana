import { and, eq, inArray } from "drizzle-orm";
import { schema } from "@/lib/db/client";
import type { Tx } from "@/lib/db/tx";
import { NotFoundError } from "@/lib/api-error";

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
