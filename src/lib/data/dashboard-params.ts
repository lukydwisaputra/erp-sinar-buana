import { delay } from "@/lib/data/_delay";
import { dashboardParamsFixture } from "@/lib/fixtures/dashboard-params";
import { dashboardParamsSchema, type DashboardParams } from "@/lib/schemas/dashboard-params";

export async function getDashboardParams(): Promise<DashboardParams> {
  await delay();
  return dashboardParamsSchema.parse(dashboardParamsFixture.current);
}

export async function updateDashboardParams(input: DashboardParams): Promise<DashboardParams> {
  await delay(400);
  const parsed = dashboardParamsSchema.parse(input);
  dashboardParamsFixture.current = parsed;
  return parsed;
}
