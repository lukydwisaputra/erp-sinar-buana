import { z } from "zod";

/** Cascading cancellation — triggered from any one of SPH/Proyek/Faktur
 * Induk (client request: cancelling any one cancels the other two linked
 * entities automatically). Exactly one of the three ids should be passed;
 * the service resolves the rest via the existing SPH→Proyek→Faktur links. */
export const cancelPembatalanSchema = z.object({
  sphId: z.string().optional(),
  proyekId: z.string().optional(),
  fakturIndukId: z.string().optional(),
  alasan: z.string().min(1, "Alasan pembatalan wajib diisi."),
  biayaAdministrasi: z.coerce.number().nonnegative().optional(),
});
export type CancelPembatalanInput = z.infer<typeof cancelPembatalanSchema>;
