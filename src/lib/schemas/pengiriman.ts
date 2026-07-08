import { z } from "zod";

export const jenisDokumenKirim = z.enum(["sph", "faktur", "slip"]);
export type JenisDokumenKirim = z.infer<typeof jenisDokumenKirim>;

export const channelPengiriman = z.enum(["whatsapp", "email"]);
export type ChannelPengiriman = z.infer<typeof channelPengiriman>;

export const deliveryStatus = z.enum(["queued", "sent", "failed"]);
export type DeliveryStatus = z.infer<typeof deliveryStatus>;

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
  /** WhatsApp rows are always "sent" (client-initiated, immediate). Only email uses the full queued→sent/failed lifecycle. */
  status: deliveryStatus,
  error: z.string().nullable(),
});
export type PengirimanLog = z.infer<typeof pengirimanLogSchema>;

export const createDeliveryInputSchema = z.object({
  jenisDokumen: jenisDokumenKirim,
  dokumenId: z.string().min(1),
  dokumenNomor: z.string().min(1),
  tujuanNama: z.string().min(1),
  tujuanKontak: z.string().min(1),
});
export type CreateDeliveryInput = z.infer<typeof createDeliveryInputSchema>;
