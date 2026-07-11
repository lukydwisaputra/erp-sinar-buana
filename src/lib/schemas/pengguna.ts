import { z } from "zod";

export const appRoleValues = ["admin", "keuangan", "sales", "tim_teknis", "viewer"] as const;
export type AppRole = (typeof appRoleValues)[number];

export const appRoleLabels: Record<AppRole, string> = {
  admin: "Admin / Owner",
  keuangan: "Keuangan",
  sales: "Marketing / Sales",
  tim_teknis: "Tim Teknis",
  viewer: "Klien (PIC)",
};

export const createPenggunaSchema = z.object({
  fullName: z.string().min(1, "Nama wajib diisi."),
  email: z.string().email("Format email tidak valid."),
  role: z.enum(appRoleValues, { message: "Peran wajib dipilih." }),
  // PRD Bab 2.4 / VR-01.4 says this link is required, but Data Karyawan is
  // still mock-fixture data (Non-goals: only auth moved to real Postgres this
  // pass) with non-UUID ids, so it can't satisfy the real employees(id) FK yet
  // — kept optional/nullable here (matches the DB column) until Karyawan
  // migrates off fixtures.
  employeeId: z.uuid().nullable(),
  // Client-contact (PIC) accounts only, role='viewer' — scopes RLS to that
  // one company's own Proyek/SPH/Faktur (db-schema/sql/rls/00_helpers.sql's
  // current_client_company_id()). Not required even when role is viewer —
  // an unlinked viewer account is just a dead end (sees nothing), not a
  // broken one, so this stays a plain optional field rather than a
  // role-conditional required one.
  clientCompanyId: z.uuid().nullable(),
});

export const updatePenggunaSchema = z.object({
  role: z.enum(appRoleValues).optional(),
  employeeId: z.uuid().nullable().optional(),
  clientCompanyId: z.uuid().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreatePenggunaInput = z.infer<typeof createPenggunaSchema>;
export type UpdatePenggunaInput = z.infer<typeof updatePenggunaSchema>;

/** Derived tri-state account status (EP-01 §6) — no isActive/pending-invite schema column needed. */
export type AkunStatus = "menunggu_aktivasi" | "aktif" | "nonaktif";

export const akunStatusLabels: Record<AkunStatus, string> = {
  menunggu_aktivasi: "Menunggu Aktivasi",
  aktif: "Aktif",
  nonaktif: "Nonaktif",
};
