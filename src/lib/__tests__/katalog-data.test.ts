import { describe, it, expect } from "vitest";
import { listKatalog, getLayanan } from "@/lib/data/katalog";
import { encodeLayanan } from "@/lib/id-generator";

describe("listKatalog", () => {
  it("returns all seeded services matching the schema", async () => {
    const rows = await listKatalog();
    expect(rows.length).toBeGreaterThanOrEqual(6);
    expect(rows[0]).toMatchObject({ id: expect.any(String), nama: expect.any(String), status: expect.stringMatching(/aktif|terarsip/) });
  });
  it("filters by nama or jenis dokumen", async () => {
    expect((await listKatalog({ q: "amdal" })).length).toBe(1);
    expect((await listKatalog({ q: "pertek" })).length).toBe(4);
  });
});

describe("getLayanan", () => {
  it("returns a service by id", async () => {
    expect((await getLayanan(encodeLayanan(2)))?.jenisDokumen).toBe("AMDAL");
  });
  it("returns null for unknown id", async () => {
    expect(await getLayanan("NOPE")).toBeNull();
  });
});
