import { desc, isNull } from "drizzle-orm";
import { withUserTransaction } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { toTaxEntry } from "@/lib/tax/mapping";
import type { TaxEntry } from "@/lib/schemas/tax-entries";

/** Read-only visibility — rows are produced by Faktur's LUNAS automation;
 * manual entry, settlement workflow (bukti-potong upload, NTPN, settle
 * actions), and Tax Center config stay out of scope this pass. */
export async function listTaxEntries(userId: string): Promise<TaxEntry[]> {
  return withUserTransaction(userId, async (tx) => {
    const rows = await tx
      .select()
      .from(schema.taxEntries)
      .where(isNull(schema.taxEntries.deletedAt))
      .orderBy(desc(schema.taxEntries.taxPeriod));
    return rows.map(toTaxEntry);
  });
}
