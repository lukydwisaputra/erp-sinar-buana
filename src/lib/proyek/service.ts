import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { withUserTransaction, withServiceRole, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import {
  toProyek,
  type ProjectRow,
  type MilestoneAssigneeRow,
} from "@/lib/proyek/mapping";
import { cloneQuotationSchedulesToProject } from "@/lib/proyek/jadwal-service";
import { cloneQuotationRabToProject } from "@/lib/proyek/rab-service";
import { createMentionNotifications } from "@/lib/notifications/service";
import { getDefaultStatusId, loadStatus, loadStatusLabelsByIds } from "@/lib/workflow-status";
import type {
  Proyek,
  CreateProyekInput,
  UpdateProyekInput,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  AddCommentInput,
  ProyekComment,
  ProyekLogEntry,
} from "@/lib/schemas/proyek";

export { toProyek } from "@/lib/proyek/mapping";

// Exported (not module-private) so src/lib/proyek/share-service.ts's
// service_role-scoped public lookup can reuse them — they're pure Tx-based
// reads with no assumption about the caller's role/transaction kind.
export async function loadCompanyName(tx: Tx, companyId: string): Promise<string> {
  const [row] = await tx.select({ name: schema.companies.name }).from(schema.companies).where(eq(schema.companies.id, companyId)).limit(1);
  return row?.name ?? "";
}

export async function loadAreaLabel(tx: Tx, areaId: string | null): Promise<string | null> {
  if (!areaId) return null;
  const [row] = await tx.select({ label: schema.adminAreas.label }).from(schema.adminAreas).where(eq(schema.adminAreas.id, areaId)).limit(1);
  return row?.label ?? null;
}

export async function loadEmployeeNames(tx: Tx, employeeIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(employeeIds)];
  if (!ids.length) return new Map();
  const rows = await tx.select({ id: schema.employees.id, name: schema.employees.name }).from(schema.employees).where(inArray(schema.employees.id, ids));
  return new Map(rows.map((r) => [r.id, r.name]));
}

async function loadServiceNames(tx: Tx, serviceIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(serviceIds)];
  if (!ids.length) return new Map();
  const rows = await tx.select({ id: schema.serviceCatalog.id, name: schema.serviceCatalog.name }).from(schema.serviceCatalog).where(inArray(schema.serviceCatalog.id, ids));
  return new Map(rows.map((r) => [r.id, r.name]));
}

async function loadSphNumber(tx: Tx, quotationId: string | null): Promise<string | null> {
  if (!quotationId) return null;
  const [row] = await tx.select({ number: schema.quotations.number }).from(schema.quotations).where(eq(schema.quotations.id, quotationId)).limit(1);
  return row?.number ?? null;
}

async function loadFakturs(tx: Tx, projectId: string): Promise<{ id: string; number: string | null }[]> {
  const rows = await tx
    .select({ id: schema.masterInvoices.id, number: schema.masterInvoices.number })
    .from(schema.masterInvoices)
    .where(and(eq(schema.masterInvoices.projectId, projectId), isNull(schema.masterInvoices.deletedAt)));
  return rows;
}

async function assembleProyek(tx: Tx, project: ProjectRow): Promise<Proyek> {
  const [services, assignees, milestoneRows, companyName, areaLabel, status, sphNumber, fakturs] = await Promise.all([
    tx.select().from(schema.projectServices).where(eq(schema.projectServices.projectId, project.id)),
    tx.select().from(schema.projectAssignees).where(eq(schema.projectAssignees.projectId, project.id)),
    tx.select().from(schema.milestones).where(eq(schema.milestones.projectId, project.id)),
    loadCompanyName(tx, project.companyId),
    loadAreaLabel(tx, project.adminAreaId),
    loadStatus(tx, project.statusId),
    loadSphNumber(tx, project.quotationId),
    loadFakturs(tx, project.id),
  ]);

  const milestoneIds = milestoneRows.map((m) => m.id);
  const milestoneAssignees: MilestoneAssigneeRow[] = milestoneIds.length
    ? await tx.select().from(schema.milestoneAssignees).where(inArray(schema.milestoneAssignees.milestoneId, milestoneIds))
    : [];

  const employeeIds = [
    ...assignees.map((a) => a.employeeId),
    ...milestoneAssignees.map((a) => a.employeeId),
  ];
  const serviceIds = services.map((s) => s.serviceId).filter((x): x is string => !!x);
  const milestoneStatusIds = milestoneRows.map((m) => m.statusId).filter((x): x is string => !!x);

  const [employeeNamesById, serviceNamesById, milestoneStatusLabelsById] = await Promise.all([
    loadEmployeeNames(tx, employeeIds),
    loadServiceNames(tx, serviceIds),
    loadStatusLabelsByIds(tx, milestoneStatusIds),
  ]);

  return toProyek({
    project,
    companyName,
    areaLabel,
    statusLabel: status?.label ?? null,
    statusSystemRole: status?.systemRole ?? null,
    services,
    serviceNamesById,
    assignees,
    employeeNamesById,
    milestones: milestoneRows,
    milestoneAssignees,
    milestoneStatusLabelsById,
    sphNumber,
    fakturs,
  });
}

export type ListProyekParams = { sphId?: string };

export async function listProyek(userId: string, params: ListProyekParams = {}): Promise<Proyek[]> {
  return withUserTransaction(userId, async (tx) => {
    const conditions = [isNull(schema.projects.deletedAt)];
    if (params.sphId) conditions.push(eq(schema.projects.quotationId, params.sphId));
    const rows = await tx
      .select()
      .from(schema.projects)
      .where(and(...conditions))
      .orderBy(desc(schema.projects.createdAt));
    return Promise.all(rows.map((row) => assembleProyek(tx, row)));
  });
}

export async function getProyek(userId: string, id: string): Promise<Proyek> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx.select().from(schema.projects).where(and(eq(schema.projects.id, id), isNull(schema.projects.deletedAt))).limit(1);
    if (!row) throw new NotFoundError("Proyek tidak ditemukan.");
    return assembleProyek(tx, row);
  });
}

/** Auto-loads a milestone template's steps as the new project's initial
 * milestones (PRD Bab 3.2's `service_catalog.milestone_template_id`, seeded
 * since the Proyek pass but never read by project creation until now).
 * Deliberately conservative: only auto-loads when the bundled services agree
 * on exactly one template — 0 or ambiguous (multiple different templates
 * across services) both skip silently rather than guess. */
async function loadMilestonesFromTemplate(tx: Tx, projectId: string, serviceIds: string[]): Promise<void> {
  const services = await tx
    .select({ milestoneTemplateId: schema.serviceCatalog.milestoneTemplateId })
    .from(schema.serviceCatalog)
    .where(inArray(schema.serviceCatalog.id, serviceIds));
  const templateIds = [...new Set(services.map((s) => s.milestoneTemplateId).filter((x): x is string => !!x))];
  if (templateIds.length !== 1) return;

  const steps = await tx
    .select()
    .from(schema.milestoneTemplateSteps)
    .where(eq(schema.milestoneTemplateSteps.templateId, templateIds[0]))
    .orderBy(asc(schema.milestoneTemplateSteps.sortOrder));
  if (!steps.length) return;

  const statusId = await getDefaultStatusId(tx, "milestone");
  await tx.insert(schema.milestones).values(
    steps.map((step) => ({
      projectId,
      name: step.name,
      statusId,
      sortOrder: step.sortOrder,
      triggersTerm: step.triggersTerm,
    })),
  );
}

/** Core create logic, usable either standalone (createProyek) or nested
 * inside another function's transaction — e.g. Penawaran's Deal-transition
 * cascade (createProyekAndFakturForDeal in penawaran/service.ts), which needs
 * this to run in the SAME transaction as the status update it's part of. */
export async function createProyekTx(tx: Tx, userId: string, input: CreateProyekInput): Promise<Proyek> {
  const statusId = await getDefaultStatusId(tx, "proyek");
  let companyId = input.perusahaanId;
  let contractValue = 0;
  let serviceIds: string[] = input.serviceIds;

  if (input.sphId) {
    const [quotation] = await tx.select().from(schema.quotations).where(eq(schema.quotations.id, input.sphId)).limit(1);
    if (!quotation) throw new NotFoundError("Penawaran (SPH) tidak ditemukan.");
    companyId = quotation.companyId;
    contractValue = Number(quotation.totalAmount);
    const items = await tx.select({ serviceId: schema.quotationItems.serviceId }).from(schema.quotationItems).where(eq(schema.quotationItems.quotationId, input.sphId));
    serviceIds = [...new Set(items.map((i) => i.serviceId).filter((x): x is string => !!x))];
  }

  const [project] = await tx
    .insert(schema.projects)
    .values({
      name: input.nama,
      companyId,
      adminAreaId: input.areaId || null,
      workYear: input.tahun ?? new Date().getFullYear(),
      statusId,
      contractValue: String(contractValue),
      quotationId: input.sphId || null,
      createdBy: userId,
      updatedBy: userId,
    })
    .returning();

  if (serviceIds.length) {
    await tx.insert(schema.projectServices).values(serviceIds.map((serviceId) => ({ projectId: project.id, serviceId })));
    await loadMilestonesFromTemplate(tx, project.id, serviceIds);
  }
  if (input.assigneeIds.length) {
    await tx.insert(schema.projectAssignees).values(input.assigneeIds.map((employeeId) => ({ projectId: project.id, employeeId, role: "anggota" as const })));
  }
  if (input.sphId) {
    await cloneQuotationSchedulesToProject(tx, input.sphId, project.id);
    await cloneQuotationRabToProject(tx, input.sphId, project.id);
  }

  return assembleProyek(tx, project);
}

export async function createProyek(userId: string, input: CreateProyekInput): Promise<Proyek> {
  return withUserTransaction(userId, (tx) => createProyekTx(tx, userId, input));
}

export async function updateProyek(userId: string, id: string, input: UpdateProyekInput): Promise<Proyek> {
  return withUserTransaction(userId, async (tx) => {
    const [existing] = await tx.select({ id: schema.projects.id }).from(schema.projects).where(and(eq(schema.projects.id, id), isNull(schema.projects.deletedAt))).limit(1);
    if (!existing) throw new NotFoundError("Proyek tidak ditemukan.");

    const [project] = await tx
      .update(schema.projects)
      .set({
        ...(input.nama !== undefined && { name: input.nama }),
        ...(input.areaId !== undefined && { adminAreaId: input.areaId || null }),
        ...(input.tahun !== undefined && { workYear: input.tahun }),
        ...(input.statusId !== undefined && { statusId: input.statusId }),
        updatedBy: userId,
      })
      .where(eq(schema.projects.id, id))
      .returning();

    if (input.assigneeIds !== undefined) {
      await tx.delete(schema.projectAssignees).where(eq(schema.projectAssignees.projectId, id));
      if (input.assigneeIds.length) {
        await tx.insert(schema.projectAssignees).values(input.assigneeIds.map((employeeId) => ({ projectId: id, employeeId, role: "anggota" as const })));
      }
    }

    return assembleProyek(tx, project);
  });
}

/** Thin wrapper over updateProyek for a pure status transition — the
 * project_status_log trigger fires on any UPDATE that changes status_id,
 * regardless of which code path performs it, so no special handling needed
 * here (unlike Penawaran's status-PATCH, which had to skip a real cascade). */
export async function updateProyekStatus(userId: string, id: string, statusId: string): Promise<Proyek> {
  return updateProyek(userId, id, { statusId });
}

export async function deleteProyek(userId: string, id: string): Promise<void> {
  await withUserTransaction(userId, async (tx) => {
    const [existing] = await tx.select({ id: schema.projects.id }).from(schema.projects).where(and(eq(schema.projects.id, id), isNull(schema.projects.deletedAt))).limit(1);
    if (!existing) throw new NotFoundError("Proyek tidak ditemukan.");
    await tx.update(schema.projects).set({ deletedAt: new Date(), deletedBy: userId }).where(eq(schema.projects.id, id));
  });
}

/** Called from Faktur's (still-mock) cancel-by-sph flow — real projects.quotation_id
 * FK makes "find the project born from this SPH" a genuine query now. */
export async function cancelProyekBySph(userId: string, sphId: string): Promise<void> {
  await withUserTransaction(userId, async (tx) => {
    const [project] = await tx.select({ id: schema.projects.id }).from(schema.projects).where(and(eq(schema.projects.quotationId, sphId), isNull(schema.projects.deletedAt))).limit(1);
    if (!project) return;
    const [batalStatus] = await tx
      .select({ id: schema.workflowStatuses.id })
      .from(schema.workflowStatuses)
      .where(and(eq(schema.workflowStatuses.entity, "proyek"), eq(schema.workflowStatuses.systemRole, "BATAL")))
      .limit(1);
    if (!batalStatus) return;
    await tx.update(schema.projects).set({ statusId: batalStatus.id, updatedBy: userId }).where(eq(schema.projects.id, project.id));
  });
}

export async function deleteProyekBySph(userId: string, sphId: string): Promise<void> {
  await withUserTransaction(userId, async (tx) => {
    const [project] = await tx.select({ id: schema.projects.id }).from(schema.projects).where(and(eq(schema.projects.quotationId, sphId), isNull(schema.projects.deletedAt))).limit(1);
    if (!project) return;
    await tx.update(schema.projects).set({ deletedAt: new Date(), deletedBy: userId }).where(eq(schema.projects.id, project.id));
  });
}

// ── Milestones ────────────────────────────────────────────────────────────

async function loadProjectOrThrow(tx: Tx, projectId: string): Promise<ProjectRow> {
  const [project] = await tx.select().from(schema.projects).where(and(eq(schema.projects.id, projectId), isNull(schema.projects.deletedAt))).limit(1);
  if (!project) throw new NotFoundError("Proyek tidak ditemukan.");
  return project;
}

function siblingCondition(projectId: string, parentId: string | null | undefined) {
  return and(
    eq(schema.milestones.projectId, projectId),
    parentId ? eq(schema.milestones.parentId, parentId) : isNull(schema.milestones.parentId),
  );
}

export async function addMilestone(userId: string, projectId: string, input: CreateMilestoneInput): Promise<Proyek> {
  return withUserTransaction(userId, async (tx) => {
    const project = await loadProjectOrThrow(tx, projectId);
    const statusId = await getDefaultStatusId(tx, "milestone");
    const siblings = await tx.select({ id: schema.milestones.id }).from(schema.milestones).where(siblingCondition(projectId, input.parentId));

    const [milestone] = await tx
      .insert(schema.milestones)
      .values({
        projectId,
        parentId: input.parentId || null,
        name: input.nama,
        statusId,
        targetDate: input.targetDate || null,
        sortOrder: siblings.length,
      })
      .returning();

    if (input.assigneeIds.length) {
      await tx.insert(schema.milestoneAssignees).values(input.assigneeIds.map((employeeId) => ({ milestoneId: milestone.id, employeeId })));
    }

    return assembleProyek(tx, project);
  });
}

export async function updateMilestone(userId: string, projectId: string, milestoneId: string, input: UpdateMilestoneInput): Promise<Proyek> {
  return withUserTransaction(userId, async (tx) => {
    const project = await loadProjectOrThrow(tx, projectId);
    const [existing] = await tx.select({ id: schema.milestones.id }).from(schema.milestones).where(and(eq(schema.milestones.id, milestoneId), eq(schema.milestones.projectId, projectId))).limit(1);
    if (!existing) throw new NotFoundError("Milestone tidak ditemukan.");

    await tx
      .update(schema.milestones)
      .set({
        ...(input.nama !== undefined && { name: input.nama }),
        ...(input.description !== undefined && { description: input.description }),
        ...(input.targetDate !== undefined && { targetDate: input.targetDate }),
        ...(input.actualDate !== undefined && { actualDate: input.actualDate }),
        ...(input.statusId !== undefined && { statusId: input.statusId }),
        ...(input.triggersTerm !== undefined && { triggersTerm: input.triggersTerm }),
        ...(input.linkedMasterInvoiceId !== undefined && { linkedMasterInvoiceId: input.linkedMasterInvoiceId }),
        updatedAt: new Date(),
      })
      .where(eq(schema.milestones.id, milestoneId));

    if (input.assigneeIds !== undefined) {
      await tx.delete(schema.milestoneAssignees).where(eq(schema.milestoneAssignees.milestoneId, milestoneId));
      if (input.assigneeIds.length) {
        await tx.insert(schema.milestoneAssignees).values(input.assigneeIds.map((employeeId) => ({ milestoneId, employeeId })));
      }
    }

    return assembleProyek(tx, project);
  });
}

/** Descendant milestones/assignees/comments cascade via the `parent_id`/
 * `milestone_id` FKs (`onDelete: cascade`) — no manual recursive walk needed,
 * unlike the mock's `collectDescendants`. */
export async function deleteMilestone(userId: string, projectId: string, milestoneId: string): Promise<Proyek> {
  return withUserTransaction(userId, async (tx) => {
    const project = await loadProjectOrThrow(tx, projectId);
    await tx.delete(schema.milestones).where(and(eq(schema.milestones.id, milestoneId), eq(schema.milestones.projectId, projectId)));
    return assembleProyek(tx, project);
  });
}

export async function moveMilestone(userId: string, projectId: string, milestoneId: string, direction: "up" | "down"): Promise<Proyek> {
  return withUserTransaction(userId, async (tx) => {
    const project = await loadProjectOrThrow(tx, projectId);
    const [target] = await tx.select().from(schema.milestones).where(and(eq(schema.milestones.id, milestoneId), eq(schema.milestones.projectId, projectId))).limit(1);
    if (!target) throw new NotFoundError("Milestone tidak ditemukan.");

    const siblings = await tx
      .select({ id: schema.milestones.id, sortOrder: schema.milestones.sortOrder })
      .from(schema.milestones)
      .where(siblingCondition(projectId, target.parentId))
      .orderBy(asc(schema.milestones.sortOrder));

    const idx = siblings.findIndex((s) => s.id === milestoneId);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= siblings.length) return assembleProyek(tx, project);

    const other = siblings[swapIdx];
    await tx.update(schema.milestones).set({ sortOrder: other.sortOrder }).where(eq(schema.milestones.id, target.id));
    await tx.update(schema.milestones).set({ sortOrder: target.sortOrder }).where(eq(schema.milestones.id, other.id));

    return assembleProyek(tx, project);
  });
}

// ── Comments (per-milestone activity feed) ──────────────────────────────────

export async function listComments(userId: string, projectId: string, milestoneId: string): Promise<ProyekComment[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.projectComments)
      .where(and(eq(schema.projectComments.projectId, projectId), eq(schema.projectComments.milestoneId, milestoneId)))
      .orderBy(asc(schema.projectComments.createdAt));

    const commentIds = rows.map((r) => r.id);
    const authorIds = rows.map((r) => r.authorId).filter((x): x is string => !!x);
    const mentionRows = commentIds.length
      ? await tx.select().from(schema.commentMentions).where(inArray(schema.commentMentions.commentId, commentIds))
      : [];

    const mentionsByComment = new Map<string, string[]>();
    for (const m of mentionRows) {
      const list = mentionsByComment.get(m.commentId) ?? [];
      list.push(m.mentionedUserId);
      mentionsByComment.set(m.commentId, list);
    }

    const namesById = await loadUserNames([...authorIds, ...mentionRows.map((m) => m.mentionedUserId)]);

    return rows.map((r) => {
      const mentionedUserIds = mentionsByComment.get(r.id) ?? [];
      return {
        id: r.id,
        proyekId: r.projectId,
        milestoneId: r.milestoneId ?? "",
        authorId: r.authorId,
        authorNama: (r.authorId && namesById.get(r.authorId)) || "—",
        body: r.body,
        mentionedUserIds,
        mentionedUserNames: mentionedUserIds.map((id) => namesById.get(id) || "—"),
        createdAt: r.createdAt.toISOString(),
      };
    });
  });
}

/** `user_profiles`' own RLS (`profiles_sel`) only lets a session read its own
 * row (`id = auth.uid() or is_admin()`) — but comment authorship/mentions/
 * status-change-actor are already visible to any role that can read the
 * comment or log entry itself (broad `read_auth` on project_comments/
 * project_status_log). Same shape as Profil Perusahaan's signer-name lookup:
 * a narrow, deliberate RLS bypass for data already exposed via the caller's
 * own RBAC gate, not a real hole. Runs its own transaction since it needs a
 * different role than the caller's `withUserTransaction`. */
async function loadUserNames(userIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(userIds)];
  if (!ids.length) return new Map();
  return withServiceRole(async (tx) => {
    const rows = await tx.select({ id: schema.userProfiles.id, fullName: schema.userProfiles.fullName }).from(schema.userProfiles).where(inArray(schema.userProfiles.id, ids));
    return new Map(rows.map((r) => [r.id, r.fullName]));
  });
}

export async function addComment(userId: string, projectId: string, milestoneId: string, input: AddCommentInput): Promise<ProyekComment> {
  const result = await withUserTransaction(userId, async (tx) => {
    const [comment] = await tx
      .insert(schema.projectComments)
      .values({ projectId, milestoneId, authorId: userId, body: input.body })
      .returning();
    if (input.mentionedUserIds.length) {
      await tx.insert(schema.commentMentions).values(input.mentionedUserIds.map((mentionedUserId) => ({ commentId: comment.id, mentionedUserId })));
    }
    const [milestone] = await tx.select({ name: schema.milestones.name }).from(schema.milestones).where(eq(schema.milestones.id, milestoneId)).limit(1);
    return { comment, milestoneName: milestone?.name ?? "milestone" };
  });

  const namesById = await loadUserNames([userId, ...input.mentionedUserIds]);
  const authorNama = namesById.get(userId) || "—";

  if (input.mentionedUserIds.length) {
    await createMentionNotifications(input.mentionedUserIds, {
      actorName: authorNama,
      milestoneName: result.milestoneName,
      commentBody: input.body,
      linkPath: `/proyek/${projectId}`,
    });
  }

  return {
    id: result.comment.id,
    proyekId: projectId,
    milestoneId,
    authorId: userId,
    authorNama,
    body: result.comment.body,
    mentionedUserIds: input.mentionedUserIds,
    mentionedUserNames: input.mentionedUserIds.map((id) => namesById.get(id) || "—"),
    createdAt: result.comment.createdAt.toISOString(),
  };
}

// ── Project status log (real, trigger-written) ─────────────────────────────

export async function listProyekLog(userId: string, projectId: string): Promise<ProyekLogEntry[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.projectStatusLog)
      .where(eq(schema.projectStatusLog.projectId, projectId))
      .orderBy(desc(schema.projectStatusLog.changedAt));

    const statusIds = rows.flatMap((r) => [r.fromStatusId, r.toStatusId]).filter((x): x is string => !!x);
    const changedByIds = rows.map((r) => r.changedBy).filter((x): x is string => !!x);
    const [statusLabelsById, userNamesById] = await Promise.all([
      loadStatusLabelsByIds(tx, statusIds),
      loadUserNames(changedByIds),
    ]);

    return rows.map((r) => ({
      id: r.id,
      fromStatus: (r.fromStatusId && statusLabelsById.get(r.fromStatusId)) ?? null,
      toStatus: (r.toStatusId && statusLabelsById.get(r.toStatusId)) ?? null,
      changedByNama: (r.changedBy && userNamesById.get(r.changedBy)) ?? null,
      changedAt: r.changedAt.toISOString(),
    }));
  });
}
