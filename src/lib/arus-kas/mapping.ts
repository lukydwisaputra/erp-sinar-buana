import type { cashflowEntries, cashflowCategories } from "@/lib/db/schema";
import type { ArusKasEntry } from "@/lib/schemas/arus-kas";
import type { CashflowCategoryRow, SifatBeban } from "@/lib/schemas/expense-nature";

export type CashflowEntryRow = typeof cashflowEntries.$inferSelect;
export type CashflowCategoryDbRow = typeof cashflowCategories.$inferSelect;

export function toArusKasEntry(row: CashflowEntryRow, categoryLabel: string | null): ArusKasEntry {
  return {
    id: row.id,
    jenis: row.type,
    tanggal: row.date,
    jumlah: Number(row.amount),
    kategori: categoryLabel ?? "—",
    categoryId: row.categoryId,
    sumber: row.source,
    keterangan: row.description ?? "",
    proyekId: row.projectId,
    locked: row.isLocked,
    isCancelled: row.isCancelled,
  };
}

const DB_TO_APP_SIFAT: Record<"HPP" | "OPERASIONAL" | "NON_LABA_RUGI", SifatBeban> = {
  HPP: "hpp",
  OPERASIONAL: "operasional",
  NON_LABA_RUGI: "non_laba_rugi",
};
const APP_TO_DB_SIFAT: Record<SifatBeban, "HPP" | "OPERASIONAL" | "NON_LABA_RUGI"> = {
  hpp: "HPP",
  operasional: "OPERASIONAL",
  non_laba_rugi: "NON_LABA_RUGI",
};

export function toCashflowCategoryRow(row: CashflowCategoryDbRow): CashflowCategoryRow {
  return {
    id: row.id,
    kategori: row.label,
    sifat: DB_TO_APP_SIFAT[row.expenseNature],
    locked: row.isSystem,
  };
}

export function toDbSifat(sifat: SifatBeban): "HPP" | "OPERASIONAL" | "NON_LABA_RUGI" {
  return APP_TO_DB_SIFAT[sifat];
}
