import type { cashflowEntries } from "@/lib/db/schema";
import type { ArusKasEntry } from "@/lib/schemas/arus-kas";

export type CashflowEntryRow = typeof cashflowEntries.$inferSelect;

export function toArusKasEntry(row: CashflowEntryRow, categoryLabel: string | null): ArusKasEntry {
  return {
    id: row.id,
    jenis: row.type,
    tanggal: row.date,
    jumlah: Number(row.amount),
    kategori: categoryLabel ?? "—",
    sumber: row.source,
    keterangan: row.description ?? "",
    proyekId: row.projectId,
    locked: row.isLocked,
    isCancelled: row.isCancelled,
  };
}
