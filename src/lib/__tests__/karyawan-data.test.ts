import { describe, it, expect } from "vitest";
import { listKaryawan, getKaryawan } from "@/lib/data/karyawan";

describe("listKaryawan", () => {
  it("returns all seeded staff matching the schema", async () => {
    const rows = await listKaryawan();
    expect(rows.length).toBeGreaterThanOrEqual(6);
    expect(rows[0]).toMatchObject({ id: expect.any(String), nama: expect.any(String), statusKepegawaian: expect.stringMatching(/tetap|kontrak|probation/) });
  });
  it("filters by nama or jabatan", async () => {
    expect((await listKaryawan({ q: "budi" })).length).toBe(1);
    expect((await listKaryawan({ q: "teknis" })).length).toBe(2);
  });
});

describe("getKaryawan", () => {
  it("returns a person by id", async () => {
    expect((await getKaryawan("KRY-001"))?.nama).toBe("Budi Santoso");
  });
  it("returns null for unknown id", async () => {
    expect(await getKaryawan("NOPE")).toBeNull();
  });
});
