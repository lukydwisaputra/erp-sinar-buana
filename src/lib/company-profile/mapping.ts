/**
 * Pure DB-row <-> app-shape mapping for Profil Perusahaan, kept free of any
 * DB connection import so this stays unit-testable without a live Postgres —
 * see `src/lib/company-profile/service.ts` for the actual queries.
 */
import type { companyProfile, employees, positions, bankAccounts } from "@/lib/db/schema";
import type { CompanyProfile } from "@/lib/schemas/company-profile";

export type CompanyProfileRow = typeof companyProfile.$inferSelect;
export type EmployeeRow = typeof employees.$inferSelect;
export type PositionRow = typeof positions.$inferSelect;
export type BankAccountRow = typeof bankAccounts.$inferSelect;

/** `direktur`/`bank` are resolved, read-only display values — `signerEmployee`/
 * `defaultBank` come from left joins, so both may be absent (no signer picked
 * yet, or no bank_accounts row flagged `is_default` yet). */
export function toCompanyProfile(
  row: CompanyProfileRow,
  signerEmployee: EmployeeRow | undefined,
  signerPosition: PositionRow | undefined,
  defaultBank: BankAccountRow | undefined,
): CompanyProfile {
  return {
    nama: row.legalName,
    tagline: row.tagline ?? "",
    logo: row.logoUrl ?? "",
    kota: row.city ?? "",
    telepon: row.phone ?? "",
    email: row.email ?? "",
    website: row.website ?? "",
    alamat: row.address ? row.address.split("\n") : [],
    npwp: row.npwp ?? "",
    isPkp: row.isPkp,
    defaultSignerEmployeeId: row.defaultSignerEmployeeId,
    direktur: {
      nama: signerEmployee?.name ?? "",
      jabatan: signerPosition?.label ?? "",
    },
    bank: {
      nama: defaultBank?.bankName ?? "",
      atasNama: defaultBank?.accountHolder ?? "",
      noRekening: defaultBank?.accountNumber ?? "",
    },
  };
}
