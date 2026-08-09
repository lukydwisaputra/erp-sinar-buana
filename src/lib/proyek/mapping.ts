/**
 * Pure DB-row <-> app-shape mapping for Proyek (project management), kept
 * free of any DB connection import so these functions stay unit-testable
 * without a live Postgres — see `src/lib/proyek/service.ts` for the queries.
 */
import type { projects, projectServices, projectAssignees, milestones, milestoneAssignees } from "@/lib/db/schema";
import type { Proyek, Milestone, ProyekShare } from "@/lib/schemas/proyek";

export type ProjectRow = typeof projects.$inferSelect;
export type ProjectServiceRow = typeof projectServices.$inferSelect;
export type ProjectAssigneeRow = typeof projectAssignees.$inferSelect;
export type MilestoneRow = typeof milestones.$inferSelect;
export type MilestoneAssigneeRow = typeof milestoneAssignees.$inferSelect;

function sortByOrder<T extends { sortOrder: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
}

function toMilestones(
  milestoneRows: MilestoneRow[],
  assigneeRows: MilestoneAssigneeRow[],
  employeeNamesById: Map<string, string>,
  statusLabelsById: Map<string, string>,
): Milestone[] {
  const assigneesByMilestone = new Map<string, { karyawanId: string; nama: string }[]>();
  for (const a of assigneeRows) {
    const list = assigneesByMilestone.get(a.milestoneId) ?? [];
    list.push({ karyawanId: a.employeeId, nama: employeeNamesById.get(a.employeeId) ?? "" });
    assigneesByMilestone.set(a.milestoneId, list);
  }
  return sortByOrder(milestoneRows).map((m) => ({
    id: m.id,
    parentId: m.parentId,
    nama: m.name,
    urutan: m.sortOrder,
    description: m.description,
    // Never persisted — mock-only ephemeral blob-URL attachments, no real
    // object storage wired for this module yet.
    descriptionAttachments: [],
    assignees: assigneesByMilestone.get(m.id) ?? [],
    targetDate: m.targetDate,
    actualDate: m.actualDate,
    statusId: m.statusId,
    status: (m.statusId && statusLabelsById.get(m.statusId)) || "—",
    triggersTerm: m.triggersTerm,
    linkedMasterInvoiceId: m.linkedMasterInvoiceId,
  }));
}

export type ToProyekInput = {
  project: ProjectRow;
  companyName: string;
  areaLabel: string | null;
  statusLabel: string | null;
  statusSystemRole: string | null;
  services: ProjectServiceRow[];
  serviceNamesById: Map<string, string>;
  assignees: ProjectAssigneeRow[];
  employeeNamesById: Map<string, string>;
  milestones: MilestoneRow[];
  milestoneAssignees: MilestoneAssigneeRow[];
  milestoneStatusLabelsById: Map<string, string>;
  sphNumber: string | null;
  fakturs: { id: string; number: string | null }[];
};

export function toProyek(input: ToProyekInput): Proyek {
  const p = input.project;
  return {
    id: p.id,
    number: p.number,
    nama: p.name,
    perusahaanId: p.companyId,
    perusahaanNama: input.companyName,
    areaId: p.adminAreaId,
    area: input.areaLabel ?? "—",
    tahun: p.workYear,
    layanan: input.services.map((s) => ({
      serviceId: s.serviceId,
      nama: (s.serviceId && input.serviceNamesById.get(s.serviceId)) || s.documentTypeLabel || "—",
    })),
    statusId: p.statusId,
    status: input.statusLabel ?? "—",
    statusSystemRole: input.statusSystemRole,
    nilaiKontrak: Number(p.contractValue),
    sphId: p.quotationId,
    sphNumber: input.sphNumber,
    fakturs: input.fakturs,
    assignees: input.assignees.map((a) => ({
      karyawanId: a.employeeId,
      nama: input.employeeNamesById.get(a.employeeId) ?? "",
    })),
    milestones: toMilestones(input.milestones, input.milestoneAssignees, input.employeeNamesById, input.milestoneStatusLabelsById),
    createdAt: p.createdAt.toISOString(),
    shareToken: p.shareToken,
  };
}

export type ToProyekShareInput = {
  project: ProjectRow;
  companyName: string;
  areaLabel: string | null;
  statusLabel: string | null;
  statusSystemRole: string | null;
  milestones: MilestoneRow[];
  milestoneAssignees: MilestoneAssigneeRow[];
  employeeNamesById: Map<string, string>;
  milestoneStatusLabelsById: Map<string, string>;
};

/** Trimmed counterpart of `toProyek` for the public share-token route —
 * deliberately takes no cost/faktur/sph inputs at all, so a future field
 * added to `ToProyekInput` can't leak here by accident. */
export function toProyekShare(input: ToProyekShareInput): ProyekShare {
  const p = input.project;
  return {
    nama: p.name,
    number: p.number,
    perusahaanNama: input.companyName,
    area: input.areaLabel ?? "—",
    tahun: p.workYear,
    status: input.statusLabel ?? "—",
    statusSystemRole: input.statusSystemRole,
    milestones: toMilestones(input.milestones, input.milestoneAssignees, input.employeeNamesById, input.milestoneStatusLabelsById),
  };
}
