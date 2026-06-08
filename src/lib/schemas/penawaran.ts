import { z } from "zod";

export const sphStatus = z.enum(["draft", "terkirim", "deal"]);
export type SphStatus = z.infer<typeof sphStatus>;

export const sphItemSchema = z.object({
  layananId: z.string(),
  nama: z.string(),
  volume: z.coerce.number(),
  harga: z.coerce.number(),
  satuan: z.string(),
});
export const sphTerminSchema = z.object({
  label: z.string(),
  persen: z.coerce.number(),
  pemicu: z.string(),
});
export const sphRabSchema = z.object({ personil: z.coerce.number(), langsung: z.coerce.number() });

/** Builder form values (no computed totals; status defaults outside the form). */
export const sphFormSchema = z.object({
  perusahaanId: z.string().min(1, "Perusahaan wajib dipilih."),
  perusahaanNama: z.string(),
  alamat: z.string(),
  tanggal: z.string().min(1, "Tanggal wajib diisi."),
  kalimatPembuka: z.string(),
  lampiran: z.string(),
  items: z.array(sphItemSchema).min(1, "Tambahkan minimal satu layanan."),
  termin: z.array(sphTerminSchema),
  rab: sphRabSchema,
  catatan: z.array(z.string()),
});
export type SphFormValues = z.infer<typeof sphFormSchema>;

/** Persisted/list shape. */
export const sphSchema = sphFormSchema.extend({ id: z.string(), status: sphStatus });
export type Sph = z.infer<typeof sphSchema>;
