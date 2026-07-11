import { z } from "zod";

/** Empty string or a valid email — the recurring "email field is optional,
 * but if filled in must be real" shape (karyawan/perusahaan contact fields).
 * `.default("")` variant for schemas that need a non-undefined fallback. */
export const optionalEmail = z.union([z.literal(""), z.string().email("Format email tidak valid.")]).optional();
export const optionalEmailDefaultEmpty = optionalEmail.default("");
