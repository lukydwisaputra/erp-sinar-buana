import { describe, it, expect } from "vitest";
import { nextNomor, updatePenomoranFormat } from "@/lib/data/penomoran";

describe("nextNomor", () => {
  it("increments within the same month", async () => {
    const at = new Date(2026, 4, 15); // May 2026
    const first = await nextNomor("sph", at);
    const second = await nextNomor("sph", at);
    expect(first).toBe("SPH/001/5.2026");
    expect(second).toBe("SPH/002/5.2026");
  });

  it("resets to 001 on month rollover", async () => {
    const may = await nextNomor("inv", new Date(2026, 4, 20));
    const june = await nextNomor("inv", new Date(2026, 5, 1));
    expect(may).toContain("/001/");
    expect(june).toContain("/001/");
  });

  it("keeps sph and inv counters independent", async () => {
    const sph = await nextNomor("sph", new Date(2027, 0, 1));
    const inv = await nextNomor("inv", new Date(2027, 0, 1));
    expect(sph).toBe("SPH/001/1.2027");
    expect(inv).toBe("INV/001/2027");
  });

  it("keeps proyek numbering independent from sph/inv", async () => {
    const proyek = await nextNomor("proyek", new Date(2028, 0, 1));
    expect(proyek).toBe("PRJ/001/2028");
  });
});

describe("updatePenomoranFormat", () => {
  it("rejects a format missing {urut}", async () => {
    await expect(updatePenomoranFormat("sph", "SPH/{tahun}")).rejects.toThrow();
  });

  it("accepts and persists a valid format", async () => {
    const updated = await updatePenomoranFormat("proyek", "PROJ-{urut}-{tahun}");
    expect(updated.formats.find((f) => f.docType === "proyek")?.format).toBe("PROJ-{urut}-{tahun}");
    await updatePenomoranFormat("proyek", "PRJ/{urut}/{tahun}"); // restore
  });
});
