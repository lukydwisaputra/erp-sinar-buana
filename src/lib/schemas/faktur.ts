import { z } from "zod";
import { sphTerminSchema } from "@/lib/schemas/penawaran";

export const fakturStatus = z.enum(["draft", "terkirim", "lunas"]);
export type FakturStatus = z.infer<typeof fakturStatus>;

export const fakturItemSchema = z.object({
  uraian: z.string(),
  volume: z.coerce.number(),
  harga: z.coerce.number(),
  satuan: z.string(),
});

export const fakturFormSchema = z.object({
  // A faktur may only be issued from a converted (deal) Penawaran.
  sphId: z.string().min(1, "Pilih Penawaran (deal) sebagai sumber faktur."),
  perusahaanId: z.string().min(1, "Perusahaan wajib dipilih."),
  perusahaanNama: z.string(),
  alamat: z.string(),
  kota: z.string(),
  npwp: z.string(),
  tanggal: z.string().min(1, "Tanggal wajib diisi."),
  jatuhTempo: z.string().min(1, "Tanggal jatuh tempo wajib diisi."),
  items: z.array(fakturItemSchema).min(1, "Tambahkan minimal satu baris."),
  terminList: z.array(sphTerminSchema).min(1, "Skema termin tidak boleh kosong."),
  terminIndex: z.coerce.number().min(0),
  ppnAktif: z.boolean(),
  ppnPersen: z.coerce.number(),
  pph23Aktif: z.boolean(),
  pph23Persen: z.coerce.number(),
  catatan: z.array(z.string()),
  status: fakturStatus,
  tanggalBayar: z.string(),
});
export type FakturFormValues = z.infer<typeof fakturFormSchema>;

export const fakturSchema = fakturFormSchema.extend({ id: z.string() });
export type Faktur = z.infer<typeof fakturSchema>;
