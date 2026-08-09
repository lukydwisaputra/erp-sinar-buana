import { z } from "zod";

/** Self-service edit — deliberately smaller than Akun Pengguna's admin-only
 * updatePenggunaSchema (role/employeeId/clientCompanyId/isActive stay
 * Admin-controlled; a user can only ever rename themselves here). */
export const updateProfilSchema = z.object({
  fullName: z.string().min(1, "Nama wajib diisi."),
});
export type UpdateProfilInput = z.infer<typeof updateProfilSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Sandi saat ini wajib diisi."),
  newPassword: z.string().min(8, "Sandi baru minimal 8 karakter."),
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
