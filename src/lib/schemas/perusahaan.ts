import { z } from "zod";

export const perusahaanStatus = z.enum(["aktif", "nonaktif"]);

/** A contact person (PIC). A company can have several. */
export const picSchema = z.object({
  nama: z.string(),
  jabatan: z.string(),
  telepon: z.string(),
  email: z.string().email(),
});
export type PIC = z.infer<typeof picSchema>;

/** Per-company rollup powering the detail-drawer mini dashboard. */
export const perusahaanMetrikSchema = z.object({
  jumlahPenawaran: z.number(),
  proyekAktif: z.number(),
  nilaiKontrak: z.number(), // IDR, lifetime contract value
  piutang: z.number(), // IDR, outstanding receivables
});
export type PerusahaanMetrik = z.infer<typeof perusahaanMetrikSchema>;

export const perusahaanSchema = z.object({
  id: z.string(),
  nama: z.string(),
  npwp: z.string(),
  alamat: z.string(),
  kota: z.string(),
  telepon: z.string(),
  email: z.string().email(),
  status: perusahaanStatus,
  pic: z.array(picSchema),
  metrik: perusahaanMetrikSchema,
});

export type Perusahaan = z.infer<typeof perusahaanSchema>;
