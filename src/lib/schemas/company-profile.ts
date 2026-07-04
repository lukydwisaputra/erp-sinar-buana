import { z } from "zod";

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
  direktur: z.object({
    nama: z.string().min(1, "Nama direktur wajib diisi."),
    jabatan: z.string().min(1, "Jabatan wajib diisi."),
  }),
  bank: z.object({
    nama: z.string().min(1, "Nama bank wajib diisi."),
    atasNama: z.string().min(1, "Atas nama wajib diisi."),
    noRekening: z.string().min(1, "Nomor rekening wajib diisi."),
  }),
});
export type CompanyProfile = z.infer<typeof companyProfileSchema>;
