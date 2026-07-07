import type { taxEntries } from "@/lib/db/schema";
import type { TaxEntry } from "@/lib/schemas/tax-entries";

export type TaxEntryRow = typeof taxEntries.$inferSelect;

export function toTaxEntry(row: TaxEntryRow): TaxEntry {
  return {
    id: row.id,
    taxType: row.taxType,
    nature: row.nature,
    taxPeriod: row.taxPeriod,
    jumlah: Number(row.amount),
    dueDate: row.dueDate,
    settlementStatus: row.settlementStatus,
    settledDate: row.settledDate,
    ntpn: row.ntpn,
    buktiPotongReceived: row.buktiPotongReceived,
    notes: row.notes ?? "",
    companyId: row.companyId,
    employeeId: row.employeeId,
  };
}
