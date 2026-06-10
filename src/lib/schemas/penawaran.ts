import { z } from "zod";

export const sphStatus = z.enum(["draft", "terkirim", "deal"]);
export type SphStatus = z.infer<typeof sphStatus>;

export const rabRowSchema = z.object({
  uraian: z.string(),
  vol: z.coerce.number(),
  satuan: z.string(),
  hargaSatuan: z.coerce.number(),
});
export const itemRabSchema = z.object({
  personil: z.array(rabRowSchema),
  langsung: z.array(rabRowSchema),
});
export const itemJadwalSchema = z.object({
  kegiatan: z.array(z.string()),
  highlights: z.array(z.array(z.number())),
  bulan: z.coerce.number().min(1),
});

export const sphItemSchema = z.object({
  layananId: z.string(),
  nama: z.string(),
  volume: z.coerce.number(),
  harga: z.coerce.number(),
  satuan: z.string(),
  rab: itemRabSchema,
  jadwal: itemJadwalSchema,
});
export const sphTerminSchema = z.object({
  label: z.string(),
  persen: z.coerce.number(),
  pemicu: z.string(),
});

/** Builder form values (no computed totals; status defaults outside the form). */
export const sphFormSchema = z.object({
  perusahaanId: z.string().min(1, "Perusahaan wajib dipilih."),
  perusahaanNama: z.string(),
  alamat: z.string(),
  tanggal: z.string().min(1, "Tanggal wajib diisi."),
  masaBerlakuAktif: z.boolean(),
  masaBerlakuHari: z.coerce.number(),
  kalimatPembuka: z.string(),
  lampiran: z.string(),
  /** Whether the RAB & Estimasi Jadwal appendix pages are managed/included. */
  rincianAktif: z.boolean().default(true),
  items: z.array(sphItemSchema).min(1, "Tambahkan minimal satu layanan."),
  termin: z.array(sphTerminSchema),
  catatan: z.array(z.string()),
  ppnAktif: z.boolean().default(false),
  ppnPersen: z.coerce.number().default(12),
  pph23Aktif: z.boolean().default(false),
  pph23Persen: z.coerce.number().default(2),
});
export type SphFormValues = z.infer<typeof sphFormSchema>;

/** Persisted/list shape. */
export const sphSchema = sphFormSchema.extend({ id: z.string(), status: sphStatus });
export type Sph = z.infer<typeof sphSchema>;
