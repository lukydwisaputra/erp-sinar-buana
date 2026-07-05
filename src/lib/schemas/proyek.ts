import { z } from "zod";

export const milestoneAttachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  type: z.string().optional(),
});

export const proyekAssigneeSchema = z.object({
  karyawanId: z.string(),
  nama: z.string(),
});

export const milestoneSchema = z.object({
  id: z.string(),
  parentId: z.string().nullable(),
  nama: z.string(),
  urutan: z.number(),
  // Blob-URL attachments on the description are a mock-only stand-in — never
  // persisted (no real object storage wired for this module yet).
  description: z.string().nullable(),
  descriptionAttachments: z.array(milestoneAttachmentSchema).default([]),
  assignees: z.array(proyekAssigneeSchema).default([]),
  targetDate: z.string().nullable(),
  actualDate: z.string().nullable(),
  statusId: z.string().nullable(),
  status: z.string(), // resolved workflow_statuses.label (entity='milestone')
  // Whether completing this milestone should suggest generating an Invoice
  // Termin (PRD Bab 6.5) — a UI suggestion only, never automatic. The mock's
  // `{fakturId, persen}` payload has no DB equivalent until Faktur is wired
  // (percen/fakturId would come from the linked master_invoice_terms row).
  triggersTerm: z.boolean(),
});
export type Milestone = z.infer<typeof milestoneSchema>;

export const proyekLayananSchema = z.object({
  serviceId: z.string().nullable(),
  nama: z.string(),
});
export type ProyekLayanan = z.infer<typeof proyekLayananSchema>;

export const proyekSchema = z.object({
  id: z.string(),
  nama: z.string(),
  perusahaanId: z.string(),
  perusahaanNama: z.string(),
  areaId: z.string().nullable(),
  area: z.string(), // resolved admin_areas.label (Daftar Pilihan "Area Kawasan")
  tahun: z.number().nullable(),
  layanan: z.array(proyekLayananSchema),
  statusId: z.string().nullable(),
  status: z.string(), // resolved workflow_statuses.label (entity='proyek')
  // Resolved workflow_statuses.system_role — automation (Dasbor's "active
  // project" filter, etc.) keys off this, never off the label, since clients
  // can freely rename/reorder labels (PRD Bab 9.2).
  statusSystemRole: z.string().nullable(),
  nilaiKontrak: z.number(),
  sphId: z.string().nullable(),
  assignees: z.array(proyekAssigneeSchema),
  milestones: z.array(milestoneSchema),
  createdAt: z.string(),
});
export type Proyek = z.infer<typeof proyekSchema>;

/** Manual project creation (no SPH) — `proyek-create.tsx`'s form. When
 * `sphId` is set, header fields/layanan/nilaiKontrak are pre-filled server
 * side from the Deal quotation instead (see proyek/service.ts::createProyek). */
export const createProyekSchema = z.object({
  nama: z.string().min(1, "Nama proyek wajib diisi."),
  perusahaanId: z.string().min(1, "Perusahaan wajib dipilih."),
  areaId: z.string().optional(),
  tahun: z.coerce.number().optional(),
  sphId: z.string().optional(),
  serviceIds: z.array(z.string()).default([]),
  assigneeIds: z.array(z.string()).default([]),
});
export type CreateProyekInput = z.infer<typeof createProyekSchema>;

/** Explicit bare-`.optional()` fields, no `.default()` — see the Penawaran
 * status-PATCH lesson (Zod resolves `.default()` for absent keys even under
 * `.partial()`, silently overwriting untouched fields on a partial update). */
export const updateProyekSchema = z.object({
  nama: z.string().optional(),
  areaId: z.string().optional(),
  tahun: z.coerce.number().optional(),
  statusId: z.string().optional(),
});
export type UpdateProyekInput = z.infer<typeof updateProyekSchema>;

export const createMilestoneSchema = z.object({
  parentId: z.string().nullable().optional(),
  nama: z.string().min(1, "Nama milestone wajib diisi."),
  assigneeIds: z.array(z.string()).default([]),
  targetDate: z.string().nullable().optional(),
});
export type CreateMilestoneInput = z.infer<typeof createMilestoneSchema>;

export const updateMilestoneSchema = z.object({
  nama: z.string().optional(),
  description: z.string().nullable().optional(),
  assigneeIds: z.array(z.string()).optional(),
  targetDate: z.string().nullable().optional(),
  actualDate: z.string().nullable().optional(),
  statusId: z.string().optional(),
  triggersTerm: z.boolean().optional(),
});
export type UpdateMilestoneInput = z.infer<typeof updateMilestoneSchema>;

export const addCommentSchema = z.object({
  body: z.string().min(1, "Komentar tidak boleh kosong."),
  mentionedUserIds: z.array(z.string()).default([]),
});
export type AddCommentInput = z.infer<typeof addCommentSchema>;

export const proyekCommentSchema = z.object({
  id: z.string(),
  proyekId: z.string(),
  milestoneId: z.string(),
  authorId: z.string().nullable(),
  authorNama: z.string(),
  body: z.string(),
  mentionedUserIds: z.array(z.string()),
  createdAt: z.string(),
});
export type ProyekComment = z.infer<typeof proyekCommentSchema>;

/** Project-level status-change history — real, trigger-written
 * (`project_status_log`), unlike the mock's fine-grained per-field log
 * (which has no DB equivalent and stays out of scope — see docs). */
export const proyekLogEntrySchema = z.object({
  id: z.string(),
  fromStatus: z.string().nullable(),
  toStatus: z.string().nullable(),
  changedByNama: z.string().nullable(),
  changedAt: z.string(),
});
export type ProyekLogEntry = z.infer<typeof proyekLogEntrySchema>;

// ── Gantt / Estimasi Jadwal (proyek-side) ────────────────────────────────────
// Reuses the same activity_schedules/rows/marked_weeks rows Penawaran writes
// at SPH time (schedules.ts: "Attached to a quotation, a project, or both
// (after Deal)") — `rencana` (isActual=0) is the read-only plan carried over
// from the SPH; `aktual` (isActual=1) is editable, ongoing progress marking.

export const proyekJadwalRowSchema = z.object({
  id: z.string(),
  kegiatan: z.string(),
  rencana: z.array(z.number()),
  aktual: z.array(z.number()),
});
export type ProyekJadwalRow = z.infer<typeof proyekJadwalRowSchema>;

export const proyekJadwalSchema = z.object({
  scheduleId: z.string(),
  layananNama: z.string().nullable(),
  bulan: z.number(),
  rows: z.array(proyekJadwalRowSchema),
});
export type ProyekJadwal = z.infer<typeof proyekJadwalSchema>;
