import { z } from "zod";

export const dashboardParamsSchema = z.object({
  horizonProyeksiHari: z.number().int().positive(),  // VR-00.6c
  ambangMarginProyek: z.number().min(0).max(1),        // fraction, matches project-profit.ts's `ambang = 0.1` default
  ambangMangkrakHari: z.number().int().positive(),     // VR-00.6c — net-new concept
});
export type DashboardParams = z.infer<typeof dashboardParamsSchema>;
