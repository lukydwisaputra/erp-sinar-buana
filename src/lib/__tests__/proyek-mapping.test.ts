import { describe, it, expect } from "vitest";
import {
  toProyek,
  type ProjectRow,
  type ProjectServiceRow,
  type ProjectAssigneeRow,
  type MilestoneRow,
  type MilestoneAssigneeRow,
  type ToProyekInput,
} from "@/lib/proyek/mapping";

function project(overrides: Partial<ProjectRow> = {}): ProjectRow {
  return {
    id: "proj-1",
    name: "Proyek Uji",
    companyId: "company-1",
    adminAreaId: "area-1",
    workYear: 2026,
    statusId: "status-1",
    contractValue: "100000000",
    quotationId: "quo-1",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date(),
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  } as ProjectRow;
}

function service(overrides: Partial<ProjectServiceRow> = {}): ProjectServiceRow {
  return {
    id: "psvc-1",
    projectId: "proj-1",
    serviceId: "svc-1",
    documentTypeLabel: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ProjectServiceRow;
}

function assignee(overrides: Partial<ProjectAssigneeRow> = {}): ProjectAssigneeRow {
  return {
    id: "pa-1",
    projectId: "proj-1",
    employeeId: "emp-1",
    role: "anggota",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as ProjectAssigneeRow;
}

function milestone(overrides: Partial<MilestoneRow> = {}): MilestoneRow {
  return {
    id: "m-1",
    projectId: "proj-1",
    parentId: null,
    name: "Survey Lokasi",
    description: null,
    assigneeEmployeeId: null,
    statusId: "mstatus-1",
    targetDate: null,
    actualDate: null,
    sortOrder: 0,
    triggersTerm: false,
    linkedProjectServiceId: null,
    linkedMasterInvoiceId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as MilestoneRow;
}

function milestoneAssignee(overrides: Partial<MilestoneAssigneeRow> = {}): MilestoneAssigneeRow {
  return {
    id: "ma-1",
    milestoneId: "m-1",
    employeeId: "emp-1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as MilestoneAssigneeRow;
}

function baseInput(overrides: Partial<ToProyekInput> = {}): ToProyekInput {
  return {
    project: project(),
    companyName: "PT Contoh",
    areaLabel: "Luar Kawasan",
    statusLabel: "Drafting",
    statusSystemRole: null,
    services: [service()],
    serviceNamesById: new Map([["svc-1", "Dokumen AMDAL"]]),
    assignees: [assignee()],
    employeeNamesById: new Map([["emp-1", "Budi"]]),
    milestones: [milestone()],
    milestoneAssignees: [milestoneAssignee()],
    milestoneStatusLabelsById: new Map([["mstatus-1", "Belum"]]),
    sphNumber: null,
    fakturs: [],
    ...overrides,
  };
}

describe("toProyek", () => {
  it("resolves company/area/status labels and service/assignee names", () => {
    const result = toProyek(baseInput());
    expect(result.perusahaanNama).toBe("PT Contoh");
    expect(result.area).toBe("Luar Kawasan");
    expect(result.status).toBe("Drafting");
    expect(result.layanan).toEqual([{ serviceId: "svc-1", nama: "Dokumen AMDAL" }]);
    expect(result.assignees).toEqual([{ karyawanId: "emp-1", nama: "Budi" }]);
  });

  it("falls back to documentTypeLabel snapshot when a service has no serviceId match", () => {
    const result = toProyek(baseInput({
      services: [service({ serviceId: null, documentTypeLabel: "AMDAL (arsip)" })],
      serviceNamesById: new Map(),
    }));
    expect(result.layanan[0].nama).toBe("AMDAL (arsip)");
  });

  it("falls back to '—' for area/status when unresolved", () => {
    const result = toProyek(baseInput({ areaLabel: null, statusLabel: null }));
    expect(result.area).toBe("—");
    expect(result.status).toBe("—");
  });

  it("converts contractValue to a number", () => {
    const result = toProyek(baseInput({ project: project({ contractValue: "250000000" }) }));
    expect(result.nilaiKontrak).toBe(250_000_000);
  });

  it("passes through statusSystemRole and sphId", () => {
    const result = toProyek(baseInput({ statusSystemRole: "SELESAI" }));
    expect(result.statusSystemRole).toBe("SELESAI");
    expect(result.sphId).toBe("quo-1");
  });

  describe("milestone regrouping", () => {
    it("resolves a milestone's status label and assignees by id", () => {
      const result = toProyek(baseInput());
      expect(result.milestones).toHaveLength(1);
      expect(result.milestones[0].status).toBe("Belum");
      expect(result.milestones[0].assignees).toEqual([{ karyawanId: "emp-1", nama: "Budi" }]);
    });

    it("does not leak assignees across milestones", () => {
      const result = toProyek(baseInput({
        milestones: [
          milestone({ id: "m-1" }),
          milestone({ id: "m-2", name: "Milestone Dua" }),
        ],
        milestoneAssignees: [milestoneAssignee({ milestoneId: "m-1" })],
      }));
      const m1 = result.milestones.find((m) => m.id === "m-1")!;
      const m2 = result.milestones.find((m) => m.id === "m-2")!;
      expect(m1.assignees).toHaveLength(1);
      expect(m2.assignees).toHaveLength(0);
    });

    it("preserves parentId for nested milestones (flat list — the UI's flattenTree reconstructs the tree, not this mapping)", () => {
      const result = toProyek(baseInput({
        milestones: [
          milestone({ id: "m-2", parentId: "m-1", sortOrder: 1, name: "Sub A" }),
          milestone({ id: "m-1", parentId: null, sortOrder: 0, name: "Induk" }),
        ],
        milestoneAssignees: [],
      }));
      expect(result.milestones.find((m) => m.id === "m-2")?.parentId).toBe("m-1");
      expect(result.milestones.find((m) => m.id === "m-1")?.parentId).toBeNull();
    });

    it("sorts milestones by sortOrder", () => {
      const result = toProyek(baseInput({
        milestones: [
          milestone({ id: "m-2", sortOrder: 1, name: "Second" }),
          milestone({ id: "m-1", sortOrder: 0, name: "First" }),
        ],
        milestoneAssignees: [],
      }));
      expect(result.milestones.map((m) => m.id)).toEqual(["m-1", "m-2"]);
    });

    it("falls back to '—' for a milestone status with no resolved label", () => {
      const result = toProyek(baseInput({ milestoneStatusLabelsById: new Map() }));
      expect(result.milestones[0].status).toBe("—");
    });
  });
});
