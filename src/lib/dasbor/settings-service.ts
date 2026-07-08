import { eq } from "drizzle-orm";
import { withUserTransaction } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import type { DashboardParams } from "@/lib/schemas/dashboard-params";

type DashboardSettingsRow = {
  projectMarginThreshold: string;
  forecastHorizonDays: number;
  stalledProjectDays: number;
};

function toDashboardParams(row: DashboardSettingsRow): DashboardParams {
  return {
    ambangMarginProyek: Number(row.projectMarginThreshold),
    horizonProyeksiHari: row.forecastHorizonDays,
    ambangMangkrakHari: row.stalledProjectDays,
  };
}

export async function getDashboardSettings(userId: string): Promise<DashboardParams> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx.select().from(schema.dashboardSettings).limit(1);
    return toDashboardParams(row as DashboardSettingsRow);
  });
}

export async function updateDashboardSettings(
  userId: string,
  input: DashboardParams,
): Promise<DashboardParams> {
  return withUserTransaction(userId, async (tx) => {
    const [row] = await tx
      .update(schema.dashboardSettings)
      .set({
        projectMarginThreshold: String(input.ambangMarginProyek),
        forecastHorizonDays: input.horizonProyeksiHari,
        stalledProjectDays: input.ambangMangkrakHari,
      })
      .where(eq(schema.dashboardSettings.singleton, true))
      .returning();
    return toDashboardParams(row as DashboardSettingsRow);
  });
}
