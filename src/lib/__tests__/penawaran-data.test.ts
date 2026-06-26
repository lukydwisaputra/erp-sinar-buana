import { describe, it, expect } from "vitest";
import { listPenawaran, getPenawaran, updatePenawaranStatus, deletePenawaran } from "@/lib/data/penawaran";
import { listFaktur } from "@/lib/data/faktur";
import { encodeSph } from "@/lib/id-generator";

const SPH1 = encodeSph(1, 5, 2026);
const SPH3 = encodeSph(3, 5, 2026);
const SPH5 = encodeSph(5, 6, 2026);

describe("listPenawaran", () => {
  it("returns all seeded SPHs matching the schema", async () => {
    const rows = await listPenawaran();
    expect(rows.length).toBeGreaterThanOrEqual(5);
    expect(rows[0]).toMatchObject({ id: expect.any(String), status: expect.stringMatching(/draft|terkirim|deal|ditolak|dibatalkan/) });
  });
  it("filters by id or perusahaan", async () => {
    expect((await listPenawaran({ q: "maju" })).length).toBe(2);
  });
});
describe("getPenawaran", () => {
  it("returns one by id", async () => { expect((await getPenawaran(SPH1))?.id).toBe(SPH1); });
  it("returns null for unknown", async () => { expect(await getPenawaran("NOPE")).toBeNull(); });
});
describe("updatePenawaranStatus", () => {
  it("changes status of an existing SPH", async () => {
    await updatePenawaranStatus(SPH3, "terkirim");
    const row = await getPenawaran(SPH3);
    expect(row?.status).toBe("terkirim");
  });

  it("auto-creates faktur set when status becomes deal", async () => {
    const before = await listFaktur();
    const beforeCount = before.filter((f) => f.sphId === SPH3).length;
    await updatePenawaranStatus(SPH3, "deal");
    const after = await listFaktur();
    const afterCount = after.filter((f) => f.sphId === SPH3).length;
    expect(afterCount).toBeGreaterThan(beforeCount);
  });

  it("throws for unknown id", async () => {
    await expect(updatePenawaranStatus("SPH/NOPE/0.0000", "deal")).rejects.toThrow();
  });
});

describe("deletePenawaran", () => {
  it("removes an SPH from the store", async () => {
    const before = await listPenawaran();
    const target = before.find((s) => s.id === SPH5);
    expect(target).toBeDefined();
    await deletePenawaran(SPH5);
    const after = await listPenawaran();
    expect(after.find((s) => s.id === SPH5)).toBeUndefined();
  });

  it("throws for unknown id", async () => {
    await expect(deletePenawaran("SPH/NOPE/0.0000")).rejects.toThrow();
  });
});
