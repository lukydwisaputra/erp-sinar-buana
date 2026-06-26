import { describe, it, expect } from "vitest";
import {
  listProyek, getProyek, createProyek,
  updateProyekStatus, updateMilestone, moveMilestone,
  addMilestone, deleteMilestone, listProyekLog,
} from "@/lib/data/proyek";
import { encodeProyekFromSph } from "@/lib/id-generator";

const PRJ1 = encodeProyekFromSph(1, 2026);
const PRJ2 = encodeProyekFromSph(2, 2026);

describe("listProyek", () => {
  it("returns all seeded projects", async () => {
    const rows = await listProyek();
    expect(rows.length).toBeGreaterThanOrEqual(3);
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
    const p = await getProyek(PRJ1);
    expect(p?.id).toBe(PRJ1);
    expect(p?.milestones.length).toBeGreaterThan(0);
  });
  it("returns null for unknown id", async () => {
    expect(await getProyek("NOPE")).toBeNull();
  });
});

describe("updateProyekStatus", () => {
  it("updates status and appends a log entry", async () => {
    await updateProyekStatus(PRJ2, "terlambat");
    const p = await getProyek(PRJ2);
    expect(p?.status).toBe("terlambat");
    const log = await listProyekLog(PRJ2);
    expect(log.some((e) => e.description.includes("Terlambat"))).toBe(true);
  });
  it("throws for unknown id", async () => {
    await expect(updateProyekStatus("PRJ/NOPE/2026", "selesai")).rejects.toThrow();
  });
});

describe("updateMilestone", () => {
  it("patches milestone fields", async () => {
    const p = await getProyek(PRJ1);
    const m = p!.milestones[2];
    await updateMilestone(PRJ1, m.id, { nama: "Updated Name" });
    const updated = await getProyek(PRJ1);
    expect(updated!.milestones.find((x) => x.id === m.id)?.nama).toBe("Updated Name");
  });
  it("appends log entry when status changes to selesai", async () => {
    const p = await getProyek(PRJ1);
    const m = p!.milestones.find((x) => x.status !== "selesai")!;
    await updateMilestone(PRJ1, m.id, { status: "selesai" });
    const log = await listProyekLog(PRJ1);
    expect(log.some((e) => e.description.toLowerCase().includes("selesai"))).toBe(true);
  });
});

describe("addMilestone / deleteMilestone", () => {
  it("adds a milestone with next urutan", async () => {
    const before = await getProyek(PRJ1);
    const maxUrutan = Math.max(...before!.milestones.map((m) => m.urutan));
    await addMilestone(PRJ1, {
      id: "ML-TEST-1",
      parentId: null,
      nama: "Test Milestone",
      description: null,
      descriptionAttachments: [],
      urutan: maxUrutan + 1,
      assignees: [],
      targetDate: null,
      actualDate: null,
      status: "belum_mulai",
      pemicuTermin: null,
    });
    const after = await getProyek(PRJ1);
    expect(after!.milestones.find((m) => m.id === "ML-TEST-1")).toBeDefined();
  });
  it("deletes a milestone and re-indexes urutan", async () => {
    const before = await getProyek(PRJ1);
    const target = before!.milestones.find((m) => m.id === "ML-TEST-1")!;
    await deleteMilestone(PRJ1, target.id);
    const after = await getProyek(PRJ1);
    expect(after!.milestones.find((m) => m.id === "ML-TEST-1")).toBeUndefined();
    const urtans = after!.milestones.map((m) => m.urutan).sort((a, b) => a - b);
    urtans.forEach((u, i) => expect(u).toBe(i + 1));
  });
});

describe("moveMilestone", () => {
  it("moves a milestone up by swapping urutan with its predecessor", async () => {
    const before = await getProyek(PRJ1);
    const sorted = [...before!.milestones].sort((a, b) => a.urutan - b.urutan);
    const second = sorted[1];
    const first = sorted[0];
    await moveMilestone(PRJ1, second.id, "up");
    const after = await getProyek(PRJ1);
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
    expect(p.id).toMatch(/^PRJ\//);
    expect(p.milestones).toHaveLength(0);
    const found = await getProyek(p.id);
    expect(found?.nama).toBe("Test Proyek");
  });
});
