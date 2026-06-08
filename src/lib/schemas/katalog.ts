import { z } from "zod";

export const katalogStatus = z.enum(["aktif", "terarsip"]);

export const layananSchema = z.object({
  id: z.string(),
  nama: z.string(),
  jenisDokumen: z.string(),
  kewenangan: z.string(),
  dasarHukum: z.string(),
  hargaStandar: z.number().nullable(),
  tags: z.array(z.string()),
  templateMilestone: z.string().nullable(),
  status: katalogStatus,
  metrik: z.object({ dipakaiSPH: z.number(), dipakaiProyek: z.number() }),
});

export type Layanan = z.infer<typeof layananSchema>;
