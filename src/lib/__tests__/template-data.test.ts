import { describe, it, expect } from "vitest";
import {
  listTemplates, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate, moveMilestoneStep,
} from "@/lib/data/template";

describe("listTemplates", () => {
  it("returns all templates when no jenis filter given", async () => {
    const rows = await listTemplates();
    expect(rows.length).toBeGreaterThanOrEqual(5);
  });

  it("filters by jenis", async () => {
    const rows = await listTemplates("milestone");
    expect(rows.every((r) => r.jenis === "milestone")).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });
});

describe("createTemplate", () => {
  it("validates terminSteps percentages are within 0-100", async () => {
    await expect(createTemplate({
      jenis: "termin", nama: "Uji Termin", jenisLayananTerkait: null, aktif: true,
      milestoneSteps: [], pdfMeta: null,
      terminSteps: [{ label: "I", persen: 150, pemicu: "x" }],
    })).rejects.toThrow();
  });

  it("creates a valid termin template", async () => {
    const created = await createTemplate({
      jenis: "termin", nama: "Uji Termin 2", jenisLayananTerkait: null, aktif: true,
      milestoneSteps: [], pdfMeta: null,
      terminSteps: [{ label: "I", persen: 100, pemicu: "Lunas" }],
    });
    expect(created.id).toMatch(/^TPL-\d{4}$/);
  });
});

describe("duplicateTemplate", () => {
  it("produces a new id with the given name, copying all steps", async () => {
    const rows = await listTemplates("milestone");
    const src = rows[0];
    const copy = await duplicateTemplate(src.id, "Salinan " + src.nama);
    expect(copy.id).not.toBe(src.id);
    expect(copy.nama).toBe("Salinan " + src.nama);
    expect(copy.milestoneSteps).toEqual(src.milestoneSteps);
  });

  it("throws for unknown id", async () => {
    await expect(duplicateTemplate("TPL-9999", "x")).rejects.toThrow("tidak ditemukan");
  });
});

describe("updateTemplate", () => {
  it("updates fields on an existing template", async () => {
    const rows = await listTemplates("pdf");
    const updated = await updateTemplate(rows[0].id, { aktif: false });
    expect(updated.aktif).toBe(false);
  });
});

describe("deleteTemplate", () => {
  it("removes the template", async () => {
    const created = await createTemplate({
      jenis: "termin", nama: "Uji Hapus", jenisLayananTerkait: null, aktif: true,
      milestoneSteps: [], pdfMeta: null, terminSteps: [],
    });
    await deleteTemplate(created.id);
    const rows = await listTemplates();
    expect(rows.find((r) => r.id === created.id)).toBeUndefined();
  });
});

describe("moveMilestoneStep", () => {
  it("swaps urutan between adjacent steps", async () => {
    const rows = await listTemplates("milestone");
    const target = rows.find((r) => r.milestoneSteps.length >= 2)!;
    const before = [...target.milestoneSteps].sort((a, b) => a.urutan - b.urutan);
    const updated = await moveMilestoneStep(target.id, 1, "up");
    const after = [...updated.milestoneSteps].sort((a, b) => a.urutan - b.urutan);
    expect(after[0].nama).toBe(before[1].nama);
    expect(after[1].nama).toBe(before[0].nama);
  });

  it("is a no-op at the top boundary", async () => {
    const rows = await listTemplates("milestone");
    const target = rows.find((r) => r.milestoneSteps.length >= 2)!;
    const before = [...target.milestoneSteps].sort((a, b) => a.urutan - b.urutan);
    const updated = await moveMilestoneStep(target.id, 0, "up");
    const after = [...updated.milestoneSteps].sort((a, b) => a.urutan - b.urutan);
    expect(after.map((s) => s.nama)).toEqual(before.map((s) => s.nama));
  });
});
