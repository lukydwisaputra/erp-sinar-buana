import { z } from "zod";

export const docTypeStatus = z.enum(["penawaran", "proyek", "milestone", "faktur", "penggajian"]);
export type DocTypeStatus = z.infer<typeof docTypeStatus>;

export const systemRole = z.enum(["SELESAI", "LUNAS", "DIBAYAR", "BATAL"]);
export type SystemRole = z.infer<typeof systemRole>;

export const statusDefinisiSchema = z.object({
  /** STABLE — matches the existing zod enum value, e.g. "lunas". Never changes for built-ins. */
  id: z.string(),
  docType: docTypeStatus,
  /** Admin-editable display text. */
  label: z.string().min(1),
  urutan: z.number(),
  aktif: z.boolean(),
  /** id/docType pair is structurally fixed (referenced by zod enums + automation)
   * for the 20 built-in rows — locked rows' labels stay editable, only the id
   * and delete/role-vacate are blocked. */
  locked: z.boolean(),
  role: systemRole.nullable(),
});
export type StatusDefinisi = z.infer<typeof statusDefinisiSchema>;
