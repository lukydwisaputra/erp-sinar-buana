import { z } from "zod";
import { optionalEmail } from "@/lib/schemas/common";

export const karyawanStatus = z.enum(["aktif", "terarsip"]);

/**
 * Standard Indonesian PTKP (Penghasilan Tidak Kena Pajak) tax-status codes —
 * a fixed statutory list (not client-configurable master data), so this is a
 * hardcoded enum rather than a 9th Daftar Pilihan category. `employees.ptkp_status`
 * is a plain nullable text column in the DB; this enum is an app-side UX aid.
 */
export const ptkpStatusValues = [
  "TK/0", "TK/1", "TK/2", "TK/3",
  "K/0", "K/1", "K/2", "K/3", "K/I/0",
] as const;
export const ptkpStatus = z.enum(ptkpStatusValues);

/**
 * Read shape: `jabatan`/`statusKepegawaian`/`pengali` are resolved server-side
 * (joins to `positions`/`employment_statuses` — see src/lib/karyawan/mapping.ts)
 * for display; the real stored references are `positionId`/`employmentStatusId`.
 * `tunjangan` is likewise computed (sum of this employee's tunjangan-kind
 * employee_salary_components), not a stored column.
 */
export const karyawanSchema = z.object({
  id: z.string(), // uuid (employees.id)
  number: z.string().nullable(), // e.g. KRY/00001 — assigned by trigger, never reset
  nama: z.string(),
  positionId: z.string().nullable(),
  jabatan: z.string(), // resolved positions.label ("—" when unset)
  employmentStatusId: z.string().nullable(),
  statusKepegawaian: z.string(), // resolved employment_statuses.label
  pengali: z.number(), // resolved employment_statuses.multiplier
  gajiPokok: z.number(), // employees.base_salary
  tunjangan: z.number(), // computed, read-only — see mapping.ts computeTunjangan
  bank: z.object({
    nama: z.string().nullable(),
    nomor: z.string().nullable(),
    atasNama: z.string().nullable(),
  }),
  npwp: z.string().nullable(),
  ptkpStatus: z.string().nullable(),
  email: z.string().nullable(),
  telepon: z.string().nullable(),
  tanggalMasuk: z.string().nullable(), // employees.join_date
  kontrakUrl: z.string().nullable(), // employees.contract_file_url
  kontrakFileName: z.string().nullable(), // employees.contract_file_name
  status: karyawanStatus, // derived from employees.is_active
});
export type Karyawan = z.infer<typeof karyawanSchema>;

/** API input schema — server-side validation for POST/PATCH /api/karyawan. */
export const createKaryawanSchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi."),
  positionId: z.string().min(1, "Jabatan wajib dipilih."),
  employmentStatusId: z.string().min(1, "Status kepegawaian wajib dipilih."),
  gajiPokok: z.coerce.number().min(1, "Gaji pokok wajib diisi."),
  bankNama: z.string().optional(),
  bankNomor: z.union([z.literal(""), z.string().regex(/^\d+$/, "Nomor rekening harus angka.")]).optional(),
  bankAtasNama: z.string().optional(),
  npwp: z.union([z.literal(""), z.string().regex(/^\d{1,16}$/, "NPWP maksimal 16 digit angka.")]).optional(),
  ptkpStatus: ptkpStatus.optional(),
  email: optionalEmail,
  telepon: z.string().optional(),
  tanggalMasuk: z.string().min(1, "Tanggal masuk wajib diisi."),
  kontrakUrl: z.string().optional(),
  kontrakFileName: z.string().optional(),
});
export type CreateKaryawanInput = z.infer<typeof createKaryawanSchema>;

export const updateKaryawanSchema = z.object({
  nama: z.string().min(1).optional(),
  positionId: z.string().min(1).optional(),
  employmentStatusId: z.string().min(1).optional(),
  gajiPokok: z.coerce.number().min(1).optional(),
  bankNama: z.string().optional(),
  bankNomor: z.union([z.literal(""), z.string().regex(/^\d+$/, "Nomor rekening harus angka.")]).optional(),
  bankAtasNama: z.string().optional(),
  npwp: z.union([z.literal(""), z.string().regex(/^\d{1,16}$/, "NPWP maksimal 16 digit angka.")]).optional(),
  ptkpStatus: ptkpStatus.optional(),
  email: optionalEmail,
  telepon: z.string().optional(),
  tanggalMasuk: z.string().min(1).optional(),
  kontrakUrl: z.string().optional(),
  kontrakFileName: z.string().optional(),
  status: karyawanStatus.optional(),
});
export type UpdateKaryawanInput = z.infer<typeof updateKaryawanSchema>;
