import { and, desc, eq, isNull } from "drizzle-orm";
import { withUserTransaction, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import { toTaxEntry } from "@/lib/tax/mapping";
import type { SettleTaxEntryInput, TaxEntry } from "@/lib/schemas/tax-entries";

/** Manual entry and file upload (proofAttachmentUrl/buktiPotongAttachmentUrl)
 * stay out of scope — a MinIO client now exists (src/lib/storage/s3.ts, used
 * by company-profile's logo upload) but nothing wires tax-entry attachments
 * to it yet; a separate feature, not part of that pass. */
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

async function getLiveRow(tx: Tx, id: string) {
  const [row] = await tx
    .select()
    .from(schema.taxEntries)
    .where(and(eq(schema.taxEntries.id, id), isNull(schema.taxEntries.deletedAt)))
    .limit(1);
  if (!row) throw new NotFoundError("Kewajiban pajak tidak ditemukan.");
  return row;
}

/** Flips a `belum_disetor` entry to `sudah_disetor` — `fn_tax_entry_after_change`
 * (db-schema/sql/triggers/40_tax_automation.sql) creates the locked
 * cashflow debit for `kewajiban`-nature entries on this same UPDATE; a
 * `kredit`-nature entry (PPh23 withheld) correctly gets no cash movement. */
export async function settleTaxEntry(
  userId: string,
  id: string,
  input: SettleTaxEntryInput,
): Promise<TaxEntry> {
  return withUserTransaction(userId, async (tx) => {
    const existing = await getLiveRow(tx, id);
    const [row] = await tx
      .update(schema.taxEntries)
      .set({
        settlementStatus: "sudah_disetor",
        settledDate: input.settledDate,
        ntpn: input.ntpn || null,
        buktiPotongReceived: input.buktiPotongReceived ?? existing.buktiPotongReceived,
        updatedAt: new Date(),
      })
      .where(eq(schema.taxEntries.id, id))
      .returning();
    return toTaxEntry(row);
  });
}

/** Correction path — reverts a settled entry back to `belum_disetor`. Does
 * NOT delete the cashflow row the trigger already created (locked =
 * historical fact, same precedent as Faktur/Penggajian's own
 * settle/cancel flows never retroactively erasing cash entries). */
export async function unsettleTaxEntry(userId: string, id: string): Promise<TaxEntry> {
  return withUserTransaction(userId, async (tx) => {
    await getLiveRow(tx, id);
    const [row] = await tx
      .update(schema.taxEntries)
      .set({
        settlementStatus: "belum_disetor",
        settledDate: null,
        ntpn: null,
        updatedAt: new Date(),
      })
      .where(eq(schema.taxEntries.id, id))
      .returning();
    return toTaxEntry(row);
  });
}

/** Standalone toggle — Keuangan may receive the bukti potong before the
 * entry is actually remitted/settled. */
export async function updateBuktiPotong(
  userId: string,
  id: string,
  received: boolean,
): Promise<TaxEntry> {
  return withUserTransaction(userId, async (tx) => {
    await getLiveRow(tx, id);
    const [row] = await tx
      .update(schema.taxEntries)
      .set({ buktiPotongReceived: received, updatedAt: new Date() })
      .where(eq(schema.taxEntries.id, id))
      .returning();
    return toTaxEntry(row);
  });
}
