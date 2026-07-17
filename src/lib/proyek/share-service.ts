import { and, eq, inArray, isNull } from "drizzle-orm";
import { withServiceRole, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import { toProyekShare } from "@/lib/proyek/mapping";
import { loadCompanyName, loadAreaLabel, loadEmployeeNames } from "@/lib/proyek/service";
import { loadStatus, loadStatusLabelsByIds } from "@/lib/workflow-status";
import type { ProyekShare } from "@/lib/schemas/proyek";

/** Public read-only lookup by share token (Proyek "Copy Link"). An anonymous
 * visitor has no session to adopt, so this runs under `withServiceRole`
 * (bypasses RLS entirely, same as auth itself) — the token match against
 * `projects.share_token` is the only access control, and `toProyekShare`'s
 * trimmed shape is what keeps cost/RAB data out of this path. */
export async function getProyekForShare(token: string): Promise<ProyekShare> {
  return withServiceRole(async (tx: Tx) => {
    const [project] = await tx
      .select()
      .from(schema.projects)
      .where(and(eq(schema.projects.shareToken, token), isNull(schema.projects.deletedAt)))
      .limit(1);
    if (!project) throw new NotFoundError("Link tidak valid atau proyek tidak ditemukan.");

    const [milestoneRows, companyName, areaLabel, status] = await Promise.all([
      tx.select().from(schema.milestones).where(eq(schema.milestones.projectId, project.id)),
      loadCompanyName(tx, project.companyId),
      loadAreaLabel(tx, project.adminAreaId),
      loadStatus(tx, project.statusId),
    ]);

    const milestoneIds = milestoneRows.map((m) => m.id);
    const milestoneAssignees = milestoneIds.length
      ? await tx.select().from(schema.milestoneAssignees).where(inArray(schema.milestoneAssignees.milestoneId, milestoneIds))
      : [];
    const employeeIds = milestoneAssignees.map((a) => a.employeeId);
    const milestoneStatusIds = milestoneRows.map((m) => m.statusId).filter((x): x is string => !!x);

    const [employeeNamesById, milestoneStatusLabelsById] = await Promise.all([
      loadEmployeeNames(tx, employeeIds),
      loadStatusLabelsByIds(tx, milestoneStatusIds),
    ]);

    return toProyekShare({
      project,
      companyName,
      areaLabel,
      statusLabel: status?.label ?? null,
      statusSystemRole: status?.systemRole ?? null,
      milestones: milestoneRows,
      milestoneAssignees,
      employeeNamesById,
      milestoneStatusLabelsById,
    });
  });
}
