import { describe, it, expect } from "vitest";
import { getDashboardParams, updateDashboardParams } from "@/lib/data/dashboard-params";

describe("getDashboardParams", () => {
  it("defaults match today's hardcoded literals", async () => {
    const params = await getDashboardParams();
    expect(params).toMatchObject({ horizonProyeksiHari: 90, ambangMarginProyek: 0.1, ambangMangkrakHari: 30 });
  });
});

describe("updateDashboardParams", () => {
  it("round-trips an update", async () => {
    const current = await getDashboardParams();
    const updated = await updateDashboardParams({ ...current, horizonProyeksiHari: 60 });
    expect(updated.horizonProyeksiHari).toBe(60);
    expect(await getDashboardParams()).toMatchObject({ horizonProyeksiHari: 60 });
    await updateDashboardParams({ ...updated, horizonProyeksiHari: 90 }); // restore
  });

  it("rejects a non-positive horizon", async () => {
    const current = await getDashboardParams();
    await expect(updateDashboardParams({ ...current, horizonProyeksiHari: 0 })).rejects.toThrow();
  });

  it("rejects ambangMarginProyek outside 0-1", async () => {
    const current = await getDashboardParams();
    await expect(updateDashboardParams({ ...current, ambangMarginProyek: 1.5 })).rejects.toThrow();
  });
});
