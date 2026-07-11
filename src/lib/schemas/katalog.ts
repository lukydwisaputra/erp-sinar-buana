import { z } from "zod";

export const katalogStatus = z.enum(["aktif", "terarsip"]);

/**
 * Read shape: `jenisDokumen`/`kewenangan`/`dasarHukum` are resolved server-side
 * (joins to `document_types`/`authorities`/`legal_bases` — see
 * src/lib/katalog/mapping.ts) for display; the real stored references are
 * `documentTypeId`/`authorityId`/`legalBasisId`. `metrik` is computed
 * client-side (Penawaran/Proyek still mock fixtures), not a stored column.
 */
export const layananSchema = z.object({
  id: z.string(), // uuid (service_catalog.id)
  number: z.string().nullable(), // e.g. LYN/00001 — assigned by trigger, never reset
  nama: z.string(),
  documentTypeId: z.string().nullable(),
  jenisDokumen: z.string(), // resolved document_types.label ("—" when unset)
  authorityId: z.string().nullable(),
  kewenangan: z.string(), // resolved authorities.label
  legalBasisId: z.string().nullable(),
  dasarHukum: z.string().nullable(), // resolved legal_bases.label
  hargaStandar: z.number().nullable(),
  isRecurring: z.boolean(), // "Tag Berulang" (PRD Bab 3.2) — e.g. Laporan Semester
  status: katalogStatus, // derived from service_catalog.is_active
  milestoneTemplateId: z.string().nullable(),
  milestoneTemplateNama: z.string().nullable(), // resolved milestone_templates.name
  metrik: z.object({ dipakaiSPH: z.number(), dipakaiProyek: z.number() }),
});
export type Layanan = z.infer<typeof layananSchema>;

/** API input schema — server-side validation for POST/PATCH /api/katalog. */
export const createLayananSchema = z.object({
  nama: z.string().min(1, "Nama layanan wajib diisi."),
  documentTypeId: z.string().min(1, "Jenis dokumen wajib dipilih."),
  authorityId: z.string().min(1, "Kewenangan wajib dipilih."),
  legalBasisId: z.string().optional(),
  hargaStandar: z.number().nullable().optional(),
  isRecurring: z.boolean().optional(),
  milestoneTemplateId: z.string().nullable().optional(),
});
export type CreateLayananInput = z.infer<typeof createLayananSchema>;

export const updateLayananSchema = z.object({
  nama: z.string().min(1).optional(),
  documentTypeId: z.string().min(1).optional(),
  authorityId: z.string().min(1).optional(),
  legalBasisId: z.string().nullable().optional(),
  hargaStandar: z.number().nullable().optional(),
  isRecurring: z.boolean().optional(),
  status: katalogStatus.optional(),
  milestoneTemplateId: z.string().nullable().optional(),
});
export type UpdateLayananInput = z.infer<typeof updateLayananSchema>;
