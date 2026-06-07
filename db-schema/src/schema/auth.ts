/**
 * Identity & RBAC.
 *
 * Authentication (passwords, email invites, reset tokens, sessions) is owned by
 * Supabase Auth in the `auth` schema — we do NOT manage `auth.users`.
 * `user_profiles` is the application-level "Akun Pengguna" (PRD Bab 2.4): a 1:1
 * extension of auth.users holding the RBAC role, the employee link and status.
 *
 * The FK `user_profiles.id -> auth.users(id)` is added in sql/00_auth_link.sql
 * (after the Drizzle migration) so Drizzle never tries to create/own the Supabase
 * `auth` schema. `id` therefore equals the auth.users id, letting RLS use
 * auth.uid() directly.
 */
import { boolean, foreignKey, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { appRole } from "./enums";
import { timestamps } from "./_shared";
import { employees } from "./master-data";

export const userProfiles = pgTable(
  "user_profiles",
  {
    // = auth.users.id (FK declared in sql/00_auth_link.sql).
    id: uuid("id").primaryKey(),
    fullName: text("full_name").notNull(),
    role: appRole("role").notNull().default("viewer"),
    // 1:1 with an employee — required for "see own payslip" and to be a project
    // assignee (PRD Bab 2.4).
    employeeId: uuid("employee_id").unique(),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (t) => ({
    employeeFk: foreignKey({
      columns: [t.employeeId],
      foreignColumns: [employees.id],
      name: "user_profiles_employee_id_fk",
    }).onDelete("set null"),
  }),
);
