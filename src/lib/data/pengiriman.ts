import { delay } from "@/lib/data/_delay";
import { pengirimanLogSchema, type PengirimanLog } from "@/lib/schemas/pengiriman";
import { pengirimanFixtures, nextPengirimanId } from "@/lib/fixtures/pengiriman";

export async function listPengirimanLog(): Promise<PengirimanLog[]> {
  await delay();
  return pengirimanLogSchema.array().parse(
    [...pengirimanFixtures].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
  );
}

export async function createPengirimanLog(
  input: Omit<PengirimanLog, "id" | "timestamp">,
): Promise<PengirimanLog> {
  await delay(300);
  const row = pengirimanLogSchema.parse({
    ...input,
    id: nextPengirimanId(),
    timestamp: new Date().toISOString(),
  });
  pengirimanFixtures.push(row);
  return row;
}
