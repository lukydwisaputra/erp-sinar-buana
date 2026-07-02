import { delay } from "@/lib/data/_delay";
import { tarifConfigFixture } from "@/lib/fixtures/tarif-config";
import { tarifConfigSchema, type TarifConfig } from "@/lib/schemas/tarif-config";

export async function getTarifConfig(): Promise<TarifConfig> {
  await delay();
  return tarifConfigSchema.parse(tarifConfigFixture.current);
}

export async function updateTarifConfig(input: TarifConfig): Promise<TarifConfig> {
  await delay(400);
  const parsed = tarifConfigSchema.parse(input);
  tarifConfigFixture.current = parsed;
  return parsed;
}
