import { z } from "zod";

export const milestoneStatus = z.enum([
  "belum_mulai", "on_track", "terlambat", "selesai",
]);

export const proyekStatus = z.enum([
  "belum_mulai", "on_track", "terlambat", "selesai", "dibatalkan",
]);

export const milestoneAttachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  type: z.string().optional(),
});

export const milestoneSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  nama: z.string(),
  urutan: z.number(),
  description: z.string().nullable(),
  descriptionAttachments: z.array(milestoneAttachmentSchema).default([]),
  assignees: z.array(z.object({ id: z.string(), nama: z.string() })).default([]),
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
