import { delay } from "@/lib/data/_delay";
import { pajakConfigFixture } from "@/lib/fixtures/pajak-config";
import { pajakConfigSchema, type PajakConfig } from "@/lib/schemas/pajak-config";

export async function getPajakConfig(): Promise<PajakConfig> {
  await delay();
  return pajakConfigSchema.parse(pajakConfigFixture.current);
}

export async function updatePajakConfig(input: PajakConfig): Promise<PajakConfig> {
  await delay(400);
  const parsed = pajakConfigSchema.parse(input);
  pajakConfigFixture.current = parsed;
  return parsed;
}
