import { z } from "zod";

export const karyawanStatus = z.enum(["aktif", "terarsip"]);
export const statusKepegawaian = z.enum(["tetap", "kontrak", "probation"]);

export const karyawanSchema = z.object({
  id: z.string(),
  nama: z.string(),
  jabatan: z.string(),
  statusKepegawaian: statusKepegawaian,
  pengali: z.number(),
  gajiPokok: z.number(),
  tunjangan: z.number(),
  bank: z.object({ nama: z.string(), nomor: z.string(), atasNama: z.string() }),
  npwp: z.string(),
  email: z.string().email(),
  telepon: z.string(),
  tanggalMasuk: z.string(),
  status: karyawanStatus,
});

export type Karyawan = z.infer<typeof karyawanSchema>;
