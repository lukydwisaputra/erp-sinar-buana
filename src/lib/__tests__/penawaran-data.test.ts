import { describe, it, expect } from "vitest";
import { listPenawaran, getPenawaran } from "@/lib/data/penawaran";

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
  it("returns one by id", async () => { expect((await getPenawaran("SPH/001/5.2026"))?.pic).toBe("Andi Wijaya"); });
  it("returns null for unknown", async () => { expect(await getPenawaran("NOPE")).toBeNull(); });
});
