import { z } from "zod";

export const proyekStatus = z.enum([
  "po_kontrak", "collecting_data", "drafting",
  "tunggu_pengesahan", "pending", "selesai", "batal",
]);

export const milestoneStatus = z.enum([
  "belum_mulai", "on_track", "terlambat", "selesai",
]);

export const milestoneSchema = z.object({
  id: z.string(),
  nama: z.string(),
  urutan: z.number(),
  assigneeNama: z.string().nullable(),
  targetDate: z.string().nullable(),
  actualDate: z.string().nullable(),
  status: milestoneStatus,
  pemicuTermin: z.object({
    fakturId: z.string(),
    persen: z.number(),
  }).nullable(),
});

export const proyekSchema = z.object({
  id: z.string(),
  nama: z.string(),
  perusahaanId: z.string(),
  perusahaanNama: z.string(),
  area: z.string(),
  tahun: z.number(),
  layananNama: z.array(z.string()),
  status: proyekStatus,
  nilaiKontrak: z.number(),
  sphId: z.string().nullable(),
  assignees: z.array(z.object({
    karyawanId: z.string(),
    nama: z.string(),
  })),
  milestones: z.array(milestoneSchema),
  createdAt: z.string(),
});

export type Proyek = z.infer<typeof proyekSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;
export type ProyekStatus = z.infer<typeof proyekStatus>;
export type MilestoneStatus = z.infer<typeof milestoneStatus>;
