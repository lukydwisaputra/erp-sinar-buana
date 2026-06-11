import { describe, it, expect } from "vitest";
import {
  listProyek, getProyek, createProyek,
  updateProyekStatus, updateMilestone, moveMilestone,
  addMilestone, deleteMilestone, listProyekLog,
} from "@/lib/data/proyek";

describe("listProyek", () => {
  it("returns all seeded projects", async () => {
    const rows = await listProyek();
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows[0]).toMatchObject({ id: expect.any(String), status: expect.any(String) });
  });
  it("filters by nama", async () => {
    const rows = await listProyek({ q: "Pertek" });
    expect(rows.length).toBeGreaterThanOrEqual(1);
    rows.forEach((r) => expect(r.nama.toLowerCase()).toContain("pertek"));
  });
  it("filters by perusahaanNama", async () => {
    const rows = await listProyek({ q: "maju" });
    expect(rows.length).toBeGreaterThanOrEqual(1);
  });
});

describe("getProyek", () => {
  it("returns a project by id", async () => {
    const p = await getProyek("PRJ-001");
    expect(p?.id).toBe("PRJ-001");
    expect(p?.milestones.length).toBeGreaterThan(0);
  });
  it("returns null for unknown id", async () => {
    expect(await getProyek("NOPE")).toBeNull();
  });
});

describe("updateProyekStatus", () => {
  it("updates status and appends a log entry", async () => {
    await updateProyekStatus("PRJ-002", "drafting");
    const p = await getProyek("PRJ-002");
    expect(p?.status).toBe("drafting");
    const log = await listProyekLog("PRJ-002");
    expect(log.some((e) => e.description.includes("drafting"))).toBe(true);
  });
  it("throws for unknown id", async () => {
    await expect(updateProyekStatus("PRJ-999", "selesai")).rejects.toThrow();
  });
});

describe("updateMilestone", () => {
  it("patches milestone fields", async () => {
    const p = await getProyek("PRJ-001");
    const m = p!.milestones[2];
    await updateMilestone("PRJ-001", m.id, { nama: "Updated Name" });
    const updated = await getProyek("PRJ-001");
    expect(updated!.milestones.find((x) => x.id === m.id)?.nama).toBe("Updated Name");
  });
  it("appends log entry when status changes to selesai", async () => {
    const p = await getProyek("PRJ-001");
    const m = p!.milestones.find((x) => x.status !== "selesai")!;
    await updateMilestone("PRJ-001", m.id, { status: "selesai" });
    const log = await listProyekLog("PRJ-001");
    expect(log.some((e) => e.description.includes("selesai"))).toBe(true);
  });
});

describe("addMilestone / deleteMilestone", () => {
  it("adds a milestone with next urutan", async () => {
    const before = await getProyek("PRJ-001");
    const maxUrutan = Math.max(...before!.milestones.map((m) => m.urutan));
    await addMilestone("PRJ-001", {
      id: "ML-TEST-1",
      nama: "Test Milestone",
      urutan: maxUrutan + 1,
      assigneeNama: null,
      targetDate: null,
      actualDate: null,
      status: "belum_mulai",
      pemicuTermin: null,
    });
    const after = await getProyek("PRJ-001");
    expect(after!.milestones.find((m) => m.id === "ML-TEST-1")).toBeDefined();
  });
  it("deletes a milestone and re-indexes urutan", async () => {
    const before = await getProyek("PRJ-001");
    const target = before!.milestones.find((m) => m.id === "ML-TEST-1")!;
    await deleteMilestone("PRJ-001", target.id);
    const after = await getProyek("PRJ-001");
    expect(after!.milestones.find((m) => m.id === "ML-TEST-1")).toBeUndefined();
    const urtans = after!.milestones.map((m) => m.urutan).sort((a, b) => a - b);
    urtans.forEach((u, i) => expect(u).toBe(i + 1));
  });
});

describe("moveMilestone", () => {
  it("moves a milestone up by swapping urutan with its predecessor", async () => {
    const before = await getProyek("PRJ-001");
    const sorted = [...before!.milestones].sort((a, b) => a.urutan - b.urutan);
    const second = sorted[1];
    const first = sorted[0];
    await moveMilestone("PRJ-001", second.id, "up");
    const after = await getProyek("PRJ-001");
    const updatedSecond = after!.milestones.find((m) => m.id === second.id)!;
    const updatedFirst = after!.milestones.find((m) => m.id === first.id)!;
    expect(updatedSecond.urutan).toBe(first.urutan);
    expect(updatedFirst.urutan).toBe(second.urutan);
  });
});

describe("createProyek", () => {
  it("creates a project with generated id and empty milestones", async () => {
    const p = await createProyek({
      nama: "Test Proyek",
      perusahaanId: "PRSH-001",
      perusahaanNama: "PT Test",
      area: "Jakarta",
      tahun: 2026,
      layananNama: ["Test Layanan"],
      nilaiKontrak: 50_000_000,
      sphId: null,
      assignees: [],
    });
    expect(p.id).toMatch(/^PRJ-/);
    expect(p.milestones).toHaveLength(0);
    const found = await getProyek(p.id);
    expect(found?.nama).toBe("Test Proyek");
  });
});
