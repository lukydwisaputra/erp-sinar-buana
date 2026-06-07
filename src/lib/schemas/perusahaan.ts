import { z } from "zod";

export const perusahaanStatus = z.enum(["aktif", "nonaktif"]);

export const perusahaanSchema = z.object({
  id: z.string(),
  nama: z.string(),
  npwp: z.string(),
  pic: z.string(),
  telepon: z.string(),
  email: z.string().email(),
  kota: z.string(),
  status: perusahaanStatus,
});

export type Perusahaan = z.infer<typeof perusahaanSchema>;
