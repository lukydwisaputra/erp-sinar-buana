import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { withUserTransaction } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";

export type SearchResultType = "proyek" | "faktur" | "perusahaan" | "karyawan";

export type SearchResult = {
  type: SearchResultType;
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const LIMIT_PER_TYPE = 5;
const MIN_QUERY_LENGTH = 2;

/**
 * Cross-module lookup for the ⌘K command palette. Runs inside
 * `withUserTransaction` like every other list query — RLS (not app code)
 * scopes results to what the caller's role can see (e.g. a `viewer` only
 * gets their own company's Proyek/Faktur rows, `tim_teknis` only assigned
 * Faktur is finance-only and simply returns nothing for other roles).
 */
export async function globalSearch(userId: string, query: string): Promise<SearchResult[]> {
  const term = query.trim();
  if (term.length < MIN_QUERY_LENGTH) return [];
  const pattern = `%${term}%`;

  return withUserTransaction(userId, async (tx) => {
    const [proyek, faktur, perusahaan, karyawan] = await Promise.all([
      tx
        .select({ id: schema.projects.id, number: schema.projects.number, name: schema.projects.name })
        .from(schema.projects)
        .where(and(
          isNull(schema.projects.deletedAt),
          or(ilike(schema.projects.name, pattern), ilike(schema.projects.number, pattern)),
        ))
        .limit(LIMIT_PER_TYPE),
      tx
        .select({ id: schema.masterInvoices.id, number: schema.masterInvoices.number, companyName: schema.companies.name })
        .from(schema.masterInvoices)
        .innerJoin(schema.companies, eq(schema.masterInvoices.companyId, schema.companies.id))
        .where(and(
          isNull(schema.masterInvoices.deletedAt),
          or(ilike(schema.masterInvoices.number, pattern), ilike(schema.companies.name, pattern)),
        ))
        .limit(LIMIT_PER_TYPE),
      tx
        .select({ id: schema.companies.id, number: schema.companies.number, name: schema.companies.name })
        .from(schema.companies)
        .where(and(
          isNull(schema.companies.deletedAt),
          or(ilike(schema.companies.name, pattern), ilike(schema.companies.number, pattern)),
        ))
        .limit(LIMIT_PER_TYPE),
      tx
        .select({ id: schema.employees.id, number: schema.employees.number, name: schema.employees.name })
        .from(schema.employees)
        .where(and(
          isNull(schema.employees.deletedAt),
          or(ilike(schema.employees.name, pattern), ilike(schema.employees.number, pattern)),
        ))
        .limit(LIMIT_PER_TYPE),
    ]);

    return [
      ...proyek.map((p): SearchResult => ({
        type: "proyek", id: p.id, title: p.name, subtitle: p.number ?? "", href: `/proyek/${p.id}`,
      })),
      ...faktur.map((f): SearchResult => ({
        type: "faktur", id: f.id, title: f.number ?? "Faktur", subtitle: f.companyName, href: `/faktur/${f.id}`,
      })),
      ...perusahaan.map((c): SearchResult => ({
        type: "perusahaan", id: c.id, title: c.name, subtitle: c.number ?? "", href: `/perusahaan`,
      })),
      ...karyawan.map((k): SearchResult => ({
        type: "karyawan", id: k.id, title: k.name, subtitle: k.number ?? "", href: `/karyawan`,
      })),
    ];
  });
}
