import { describe, it, expect } from "vitest";
import { computeProyekSummary } from "@/lib/dasbor/proyek-summary";
import { filterProyekForRole } from "@/lib/dasbor/rbac-view";
import type { Proyek } from "@/lib/schemas/proyek";
import type { SessionUser } from "@/lib/auth/session";

function mkProyek(overrides: Partial<Proyek> = {}): Proyek {
  return {
    id: "P1", number: "PRY/001", nama: "Proyek Satu", perusahaanId: "C1", perusahaanNama: "PT Klien",
    areaId: null, area: "Jakarta", tahun: 2026, layanan: [{ serviceId: "s1", nama: "AMDAL" }],
    statusId: null, status: "Berjalan", statusSystemRole: null, nilaiKontrak: 100_000_000,
    sphId: null, assignees: [], milestones: [], createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function mkSession(overrides: Partial<SessionUser> = {}): SessionUser {
  return { id: "u1", fullName: "Budi", role: "viewer", employeeId: null, isActive: true, ...overrides };
}

describe("computeProyekSummary", () => {
  it("counts total and breaks down by status/area/layanan", () => {
    const summary = computeProyekSummary([
      mkProyek({ id: "P1", status: "Berjalan", area: "Jakarta", layanan: [{ serviceId: "s1", nama: "AMDAL" }] }),
      mkProyek({ id: "P2", status: "Selesai", area: "Jakarta", layanan: [{ serviceId: "s2", nama: "UKL-UPL" }] }),
      mkProyek({ id: "P3", status: "Berjalan", area: "Bandung", layanan: [{ serviceId: "s1", nama: "AMDAL" }] }),
    ]);
    expect(summary.total).toBe(3);
    expect(summary.byStatus).toEqual([{ label: "Berjalan", count: 2 }, { label: "Selesai", count: 1 }]);
    expect(summary.byArea).toEqual([{ label: "Jakarta", count: 2 }, { label: "Bandung", count: 1 }]);
    expect(summary.byLayanan).toEqual([{ label: "AMDAL", count: 2 }, { label: "UKL-UPL", count: 1 }]);
  });

  it("returns zeroed breakdowns for an empty list", () => {
    const summary = computeProyekSummary([]);
    expect(summary.total).toBe(0);
    expect(summary.byStatus).toEqual([]);
  });
});

describe("filterProyekForRole", () => {
  const proyeks = [
    mkProyek({ id: "P1", assignees: [{ karyawanId: "emp-1", nama: "Budi" }] }),
    mkProyek({ id: "P2", assignees: [{ karyawanId: "emp-2", nama: "Rina" }] }),
  ];

  it("returns nothing for a null session", () => {
    expect(filterProyekForRole(proyeks, null)).toEqual([]);
  });

  it("returns every project for admin/keuangan/sales/viewer", () => {
    for (const role of ["admin", "keuangan", "sales", "viewer"] as const) {
      expect(filterProyekForRole(proyeks, mkSession({ role }))).toHaveLength(2);
    }
  });

  it("narrows tim_teknis to only their assigned projects", () => {
    const result = filterProyekForRole(proyeks, mkSession({ role: "tim_teknis", employeeId: "emp-1" }));
    expect(result).toEqual([proyeks[0]]);
  });

  it("returns nothing for a tim_teknis session with no linked employee", () => {
    const result = filterProyekForRole(proyeks, mkSession({ role: "tim_teknis", employeeId: null }));
    expect(result).toEqual([]);
  });
});
