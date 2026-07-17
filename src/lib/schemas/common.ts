import { z } from "zod";

/** Empty string or a valid email — the recurring "email field is optional,
 * but if filled in must be real" shape (karyawan/perusahaan contact fields).
 * `.default("")` variant for schemas that need a non-undefined fallback. */
export const optionalEmail = z.union([z.literal(""), z.string().email("Format email tidak valid.")]).optional();
export const optionalEmailDefaultEmpty = optionalEmail.default("");

/** Formal-letter salutation — stored per PIC (Perusahaan contacts) and per-SPH
 * (generic "Kepada Yth." line), both in schemas/perusahaan.ts and
 * schemas/penawaran.ts. */
export const salutationValues = ["bapak", "ibu", "bapak_ibu"] as const;
export const salutationSchema = z.enum(salutationValues);
export type Salutation = (typeof salutationValues)[number];
export const SALUTATION_LABEL: Record<Salutation, string> = {
  bapak: "Bapak",
  ibu: "Ibu",
  bapak_ibu: "Bapak/Ibu",
};
