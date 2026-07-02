import { z } from "zod";

export const jenisDokumenKirim = z.enum(["sph", "faktur", "slip"]);
export type JenisDokumenKirim = z.infer<typeof jenisDokumenKirim>;

export const channelPengiriman = z.enum(["whatsapp", "email"]);
export type ChannelPengiriman = z.infer<typeof channelPengiriman>;

export const pengirimanLogSchema = z.object({
  id: z.string(),
  jenisDokumen: jenisDokumenKirim,
  dokumenId: z.string(),
  dokumenNomor: z.string(),
  tujuanNama: z.string(),
  /** Phone or email, depending on channel. */
  tujuanKontak: z.string(),
  channel: channelPengiriman,
  timestamp: z.string(),
});
export type PengirimanLog = z.infer<typeof pengirimanLogSchema>;
