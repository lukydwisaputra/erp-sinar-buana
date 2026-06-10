import { describe, it, expect } from "vitest";
import { listPenawaran, getPenawaran, updatePenawaranStatus } from "@/lib/data/penawaran";
import { listFaktur } from "@/lib/data/faktur";

describe("listPenawaran", () => {
  it("returns all seeded SPHs matching the schema", async () => {
    const rows = await listPenawaran();
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(rows[0]).toMatchObject({ id: expect.any(String), status: expect.stringMatching(/draft|terkirim|deal/) });
  });
  it("filters by id or perusahaan", async () => {
    expect((await listPenawaran({ q: "maju" })).length).toBe(1);
  });
});
describe("getPenawaran", () => {
  it("returns one by id", async () => { expect((await getPenawaran("SPH/001/5.2026"))?.id).toBe("SPH/001/5.2026"); });
  it("returns null for unknown", async () => { expect(await getPenawaran("NOPE")).toBeNull(); });
});
describe("updatePenawaranStatus", () => {
  it("changes status of an existing SPH", async () => {
    await updatePenawaranStatus("SPH/003/5.2026", "terkirim");
    const row = await getPenawaran("SPH/003/5.2026");
    expect(row?.status).toBe("terkirim");
  });

  it("auto-creates faktur set when status becomes deal", async () => {
    const before = await listFaktur();
    const beforeCount = before.filter((f) => f.sphId === "SPH/003/5.2026").length;
    await updatePenawaranStatus("SPH/003/5.2026", "deal");
    const after = await listFaktur();
    const afterCount = after.filter((f) => f.sphId === "SPH/003/5.2026").length;
    expect(afterCount).toBeGreaterThan(beforeCount);
  });

  it("throws for unknown id", async () => {
    await expect(updatePenawaranStatus("SPH/999/0.0000", "deal")).rejects.toThrow();
  });
});
