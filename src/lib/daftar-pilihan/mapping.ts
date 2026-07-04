/**
 * Pure DB-row <-> app-shape mapping for Daftar Pilihan, kept free of any DB
 * connection import so these functions stay unit-testable without a live
 * Postgres — see `src/lib/daftar-pilihan/service.ts` for the actual queries.
 *
 * Each of the 8 categories is backed by its own strongly-typed table
 * (db-schema/src/schema/config.ts) — 5 share an identical plain
 * {label, isActive, sortOrder} shape, 3 (status_kepegawaian, komponen_gaji,
 * rekening_bank) carry extra columns. The app-facing `OptionItem` shape is
 * uniform across all 8 so the UI (daftar-pilihan-tab.tsx) and its consumers
 * (Karyawan/Katalog/Proyek) don't need to branch on kategori — this file is
 * where that per-category branching belongs instead.
 */
import type {
  documentTypes,
  authorities,
  legalBases,
  adminAreas,
  positions,
  employmentStatuses,
  salaryComponents,
  bankAccounts,
} from "@/lib/db/schema";
import type {
  DaftarPilihanKategori,
  OptionItem,
  OptionExtra,
} from "@/lib/schemas/daftar-pilihan";

export type PlainLookupRow =
  | typeof documentTypes.$inferSelect
  | typeof authorities.$inferSelect
  | typeof legalBases.$inferSelect
  | typeof adminAreas.$inferSelect
  | typeof positions.$inferSelect;
export type EmploymentStatusRow = typeof employmentStatuses.$inferSelect;
export type SalaryComponentRow = typeof salaryComponents.$inferSelect;
export type BankAccountRow = typeof bankAccounts.$inferSelect;
export type LookupRow = PlainLookupRow | EmploymentStatusRow | SalaryComponentRow | BankAccountRow;

function baseFields(kategori: DaftarPilihanKategori, row: LookupRow) {
  return {
    id: row.id,
    kategori,
    nama: row.label,
    urutan: row.sortOrder,
    aktif: row.isActive,
    // No DB column backs `locked` today — see src/lib/schemas/daftar-pilihan.ts.
    locked: false,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toOptionItem(kategori: DaftarPilihanKategori, row: LookupRow): OptionItem {
  if (kategori === "status_kepegawaian") {
    const r = row as EmploymentStatusRow;
    return { ...baseFields(kategori, r), extra: { pengali: Number(r.multiplier) } };
  }
  if (kategori === "komponen_gaji") {
    const r = row as SalaryComponentRow;
    return {
      ...baseFields(kategori, r),
      extra: {
        kind: r.kind,
        calcMethod: r.calcType,
        defaultValue: Number(r.defaultValue),
        isEmployerPortion: r.isEmployerPortion,
      },
    };
  }
  if (kategori === "rekening_bank") {
    const r = row as BankAccountRow;
    return {
      ...baseFields(kategori, r),
      extra: {
        bank: { nama: r.bankName, atasNama: r.accountHolder, nomor: r.accountNumber },
        isDefault: r.isDefault,
      },
    };
  }
  return { ...baseFields(kategori, row as PlainLookupRow), extra: {} };
}

/** Column values (beyond {label, sortOrder, isActive}) to write for a category's extra fields. */
export function extraToColumns(kategori: DaftarPilihanKategori, extra: OptionExtra): Record<string, unknown> {
  if (kategori === "status_kepegawaian") {
    return extra.pengali !== undefined ? { multiplier: String(extra.pengali) } : {};
  }
  if (kategori === "komponen_gaji") {
    return {
      ...(extra.kind !== undefined && { kind: extra.kind }),
      ...(extra.calcMethod !== undefined && { calcType: extra.calcMethod }),
      ...(extra.defaultValue !== undefined && { defaultValue: String(extra.defaultValue) }),
      ...(extra.isEmployerPortion !== undefined && { isEmployerPortion: extra.isEmployerPortion }),
    };
  }
  if (kategori === "rekening_bank") {
    return {
      ...(extra.bank && {
        bankName: extra.bank.nama,
        accountHolder: extra.bank.atasNama,
        accountNumber: extra.bank.nomor,
      }),
      ...(extra.isDefault !== undefined && { isDefault: extra.isDefault }),
    };
  }
  return {};
}
