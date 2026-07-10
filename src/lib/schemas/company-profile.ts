import { z } from "zod";

/** Read shape, returned by GET /api/company-profile. `direktur`/`bank` are
 * resolved server-side (joined from `employees`/`positions` and the default
 * `bank_accounts` row) — read-only, never sent back on write. */
export const companyProfileSchema = z.object({
  nama: z.string().min(1, "Nama perusahaan wajib diisi."),
  tagline: z.string(),
  /** Empty = documents render the "SBMJ" placeholder badge instead of an image. */
  logo: z.string(),
  kota: z.string().min(1, "Kota wajib diisi."),
  telepon: z.string().min(1, "Telepon wajib diisi."),
  email: z.string().email("Format email tidak valid."),
  website: z.string(),
  alamat: z.array(z.string().min(1)).min(1, "Minimal satu alamat."),
  npwp: z.string(),
  isPkp: z.boolean(),
  defaultSignerEmployeeId: z.string().nullable(),
  direktur: z.object({
    nama: z.string(),
    jabatan: z.string(),
  }),
  bank: z.object({
    nama: z.string(),
    atasNama: z.string(),
    noRekening: z.string(),
  }),
});
export type CompanyProfile = z.infer<typeof companyProfileSchema>;

/** Write shape, accepted by PATCH /api/company-profile. No `direktur`/`bank`
 * objects — the signer is written via FK (`defaultSignerEmployeeId`, picked
 * from Karyawan) and the bank is fully derived from Konfigurasi > Daftar
 * Pilihan's default-flagged `bank_accounts` row (not editable here). */
export const updateCompanyProfileSchema = z.object({
  nama: z.string().min(1, "Nama perusahaan wajib diisi."),
  tagline: z.string(),
  logo: z.string(),
  kota: z.string().min(1, "Kota wajib diisi."),
  telepon: z.string().min(1, "Telepon wajib diisi."),
  email: z.string().email("Format email tidak valid."),
  website: z.string(),
  alamat: z.array(z.string().min(1)).min(1, "Minimal satu alamat."),
  npwp: z.string(),
  isPkp: z.boolean(),
  defaultSignerEmployeeId: z.string().nullable(),
});
export type UpdateCompanyProfileInput = z.infer<typeof updateCompanyProfileSchema>;
