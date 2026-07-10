import { eq } from "drizzle-orm";
import { withUserTransaction, withServiceRole } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { toCompanyProfile, type CompanyProfileRow } from "@/lib/company-profile/mapping";
import type { CompanyProfile, UpdateCompanyProfileInput } from "@/lib/schemas/company-profile";

export { toCompanyProfile } from "@/lib/company-profile/mapping";

/**
 * `employees`/`positions` RLS (`employees_sel`) only grants SELECT to
 * admin/keuangan/tim_teknis (same Data Karyawan RBAC as everywhere else in
 * this repo) — but GET /api/company-profile is intentionally open to all 5
 * roles, since every role needs the resolved signer name/title to render on
 * SPH/Faktur/Slip document previews. Resolving it under `withServiceRole`
 * deliberately crosses that RLS boundary for this one narrow, already
 * publicly-exposed lookup (same justification as `withServiceRole`'s other
 * callers) — plain `withUserTransaction` here would silently return an empty
 * signer name/jabatan for Sales/Viewer sessions.
 */
async function loadResolved(row: CompanyProfileRow): Promise<CompanyProfile> {
  return withServiceRole(async (tx) => {
    const [signerEmployee] = row.defaultSignerEmployeeId
      ? await tx.select().from(schema.employees).where(eq(schema.employees.id, row.defaultSignerEmployeeId)).limit(1)
      : [];
    const [signerPosition] = signerEmployee?.positionId
      ? await tx.select().from(schema.positions).where(eq(schema.positions.id, signerEmployee.positionId)).limit(1)
      : [];
    const [defaultBank] = await tx
      .select()
      .from(schema.bankAccounts)
      .where(eq(schema.bankAccounts.isDefault, true))
      .limit(1);
    return toCompanyProfile(row, signerEmployee, signerPosition, defaultBank);
  });
}

export async function getCompanyProfile(userId: string): Promise<CompanyProfile> {
  const row = await withUserTransaction(userId, async (tx) => {
    const [r] = await tx.select().from(schema.companyProfile).limit(1);
    return r;
  });
  return loadResolved(row);
}

export async function updateCompanyProfile(
  userId: string,
  input: UpdateCompanyProfileInput,
): Promise<CompanyProfile> {
  const row = await withUserTransaction(userId, async (tx) => {
    const [r] = await tx
      .update(schema.companyProfile)
      .set({
        legalName: input.nama,
        tagline: input.tagline || null,
        city: input.kota,
        phone: input.telepon,
        email: input.email,
        website: input.website || null,
        address: input.alamat.join("\n"),
        logoUrl: input.logo || null,
        npwp: input.npwp || null,
        isPkp: input.isPkp,
        defaultSignerEmployeeId: input.defaultSignerEmployeeId,
        updatedAt: new Date(),
      })
      .where(eq(schema.companyProfile.singleton, true))
      .returning();
    return r;
  });
  return loadResolved(row);
}
