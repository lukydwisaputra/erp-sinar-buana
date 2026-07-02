import type { DashboardParams } from "@/lib/schemas/dashboard-params";

/** horizonProyeksiHari/ambangMarginProyek reproduce today's hardcoded defaults
 * (forecast.ts's `?? 90`, project-profit.ts's `ambang = 0.1`) exactly.
 * ambangMangkrakHari is a new concept with no prior behavior to preserve. */
export const dashboardParamsFixture: { current: DashboardParams } = {
  current: {
    horizonProyeksiHari: 90,
    ambangMarginProyek: 0.1,
    ambangMangkrakHari: 30,
  },
};
