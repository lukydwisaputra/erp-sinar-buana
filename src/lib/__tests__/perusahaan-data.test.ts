import { describe, it, expect } from "vitest";
import { listPerusahaan, getPerusahaan } from "@/lib/data/perusahaan";

describe("listPerusahaan", () => {
  it("returns all seeded rows, each matching the schema shape", async () => {
    const rows = await listPerusahaan();
    expect(rows.length).toBeGreaterThanOrEqual(6);
    expect(rows[0]).toMatchObject({ id: expect.any(String), nama: expect.any(String), status: expect.stringMatching(/aktif|nonaktif/) });
  });
  it("filters by query on nama/pic", async () => {
    const rows = await listPerusahaan({ q: "maju" });
    expect(rows).toHaveLength(1);
    expect(rows[0].nama).toContain("Maju");
  });
});

describe("getPerusahaan", () => {
  it("returns a row by id", async () => {
    expect((await getPerusahaan("PRSH-001"))?.nama).toContain("Maju");
  });
  it("returns null for unknown id", async () => {
    expect(await getPerusahaan("NOPE")).toBeNull();
  });
});
