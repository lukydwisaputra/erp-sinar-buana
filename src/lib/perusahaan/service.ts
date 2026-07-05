import { and, asc, desc, eq, inArray, isNull, notInArray, or, sql } from "drizzle-orm";
import { withUserTransaction, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError } from "@/lib/api-error";
import { toPerusahaan, toContactRows, type ContactRow } from "@/lib/perusahaan/mapping";
import type {
  Perusahaan,
  CreatePerusahaanInput,
  UpdatePerusahaanInput,
} from "@/lib/schemas/perusahaan";

export { computeMetrik, toPerusahaan, toContactRows } from "@/lib/perusahaan/mapping";

async function loadContacts(tx: Tx, companyId: string): Promise<ContactRow[]> {
  return tx
    .select()
    .from(schema.companyContacts)
    .where(eq(schema.companyContacts.companyId, companyId));
}

/** Real count of (non-deleted) quotations per company — Penawaran is wired,
 * so `jumlahPenawaran` no longer reads the frozen mock fixture array. */
async function countPenawaranByCompany(tx: Tx, companyIds: string[]): Promise<Map<string, number>> {
  if (!companyIds.length) return new Map();
  const rows = await tx
    .select({ companyId: schema.quotations.companyId, count: sql<number>`count(*)::int` })
    .from(schema.quotations)
    .where(and(inArray(schema.quotations.companyId, companyIds), isNull(schema.quotations.deletedAt)))
    .groupBy(schema.quotations.companyId);
  return new Map(rows.map((r) => [r.companyId, r.count]));
}

/** Real count/sum of active (non-terminal) projects per company — Proyek is
 * wired, so `proyekAktif`/`nilaiKontrak` no longer read the frozen mock
 * fixture array. "Active" = systemRole isn't a terminal SELESAI/BATAL (never
 * a label match — clients rename/reorder workflow_statuses labels freely). */
async function countActiveProjectsByCompany(tx: Tx, companyIds: string[]): Promise<Map<string, { proyekAktif: number; nilaiKontrak: number }>> {
  if (!companyIds.length) return new Map();
  const rows = await tx
    .select({
      companyId: schema.projects.companyId,
      count: sql<number>`count(*)::int`,
      total: sql<string>`coalesce(sum(${schema.projects.contractValue}), 0)`,
    })
    .from(schema.projects)
    .leftJoin(schema.workflowStatuses, eq(schema.projects.statusId, schema.workflowStatuses.id))
    .where(
      and(
        inArray(schema.projects.companyId, companyIds),
        isNull(schema.projects.deletedAt),
        or(isNull(schema.workflowStatuses.systemRole), notInArray(schema.workflowStatuses.systemRole, ["SELESAI", "BATAL"])),
      ),
    )
    .groupBy(schema.projects.companyId);
  return new Map(rows.map((r) => [r.companyId, { proyekAktif: r.count, nilaiKontrak: Number(r.total) }]));
}

export async function listCompanies(userId: string): Promise<Perusahaan[]> {
  return withUserTransaction(userId, async (tx) => {
    const companies = await tx
      .select()
      .from(schema.companies)
      .where(isNull(schema.companies.deletedAt))
      .orderBy(desc(schema.companies.createdAt));
    const allContacts = await tx
      .select()
      .from(schema.companyContacts)
      .orderBy(asc(schema.companyContacts.createdAt));
    const contactsByCompany = new Map<string, ContactRow[]>();
    for (const c of allContacts) {
      const list = contactsByCompany.get(c.companyId) ?? [];
      list.push(c);
      contactsByCompany.set(c.companyId, list);
    }
    const companyIds = companies.map((c) => c.id);
    const [penawaranCounts, projectStats] = await Promise.all([
      countPenawaranByCompany(tx, companyIds),
      countActiveProjectsByCompany(tx, companyIds),
    ]);
    return companies.map((c) => {
      const stats = projectStats.get(c.id);
      return toPerusahaan(c, contactsByCompany.get(c.id) ?? [], penawaranCounts.get(c.id) ?? 0, stats?.proyekAktif ?? 0, stats?.nilaiKontrak ?? 0);
    });
  });
}

export async function getCompany(userId: string, id: string): Promise<Perusahaan> {
  return withUserTransaction(userId, async (tx) => {
    const [company] = await tx
      .select()
      .from(schema.companies)
      .where(and(eq(schema.companies.id, id), isNull(schema.companies.deletedAt)))
      .limit(1);
    if (!company) throw new NotFoundError("Perusahaan tidak ditemukan.");
    const contacts = await loadContacts(tx, id);
    const [penawaranCounts, projectStats] = await Promise.all([
      countPenawaranByCompany(tx, [id]),
      countActiveProjectsByCompany(tx, [id]),
    ]);
    const stats = projectStats.get(id);
    return toPerusahaan(company, contacts, penawaranCounts.get(id) ?? 0, stats?.proyekAktif ?? 0, stats?.nilaiKontrak ?? 0);
  });
}

export async function createCompany(
  userId: string,
  input: CreatePerusahaanInput,
): Promise<Perusahaan> {
  return withUserTransaction(userId, async (tx) => {
    const [company] = await tx
      .insert(schema.companies)
      .values({
        name: input.nama,
        address: input.alamat,
        city: input.kota,
        regency: input.kabupaten,
        npwp: input.npwp,
        email: input.email || null,
        createdBy: userId,
        updatedBy: userId,
      })
      .returning();
    const contacts = input.pic.length
      ? await tx
          .insert(schema.companyContacts)
          .values(toContactRows(input.pic, company.id))
          .returning()
      : [];
    return toPerusahaan(company, contacts, 0, 0, 0);
  });
}

export async function updateCompany(
  userId: string,
  id: string,
  input: UpdatePerusahaanInput,
): Promise<Perusahaan> {
  return withUserTransaction(userId, async (tx) => {
    const [existing] = await tx
      .select({ id: schema.companies.id })
      .from(schema.companies)
      .where(and(eq(schema.companies.id, id), isNull(schema.companies.deletedAt)))
      .limit(1);
    if (!existing) throw new NotFoundError("Perusahaan tidak ditemukan.");

    const [company] = await tx
      .update(schema.companies)
      .set({
        ...(input.nama !== undefined && { name: input.nama }),
        ...(input.alamat !== undefined && { address: input.alamat }),
        ...(input.kota !== undefined && { city: input.kota }),
        ...(input.kabupaten !== undefined && { regency: input.kabupaten }),
        ...(input.npwp !== undefined && { npwp: input.npwp }),
        ...(input.email !== undefined && { email: input.email || null }),
        ...(input.status !== undefined && { isActive: input.status === "aktif" }),
        updatedBy: userId,
      })
      .where(eq(schema.companies.id, id))
      .returning();

    if (input.pic !== undefined) {
      await tx.delete(schema.companyContacts).where(eq(schema.companyContacts.companyId, id));
      if (input.pic.length) {
        await tx.insert(schema.companyContacts).values(toContactRows(input.pic, id));
      }
    }

    const contacts = await loadContacts(tx, id);
    const [penawaranCounts, projectStats] = await Promise.all([
      countPenawaranByCompany(tx, [id]),
      countActiveProjectsByCompany(tx, [id]),
    ]);
    const stats = projectStats.get(id);
    return toPerusahaan(company, contacts, penawaranCounts.get(id) ?? 0, stats?.proyekAktif ?? 0, stats?.nilaiKontrak ?? 0);
  });
}

export async function deleteCompany(userId: string, id: string): Promise<void> {
  await withUserTransaction(userId, async (tx) => {
    const [existing] = await tx
      .select({ id: schema.companies.id })
      .from(schema.companies)
      .where(and(eq(schema.companies.id, id), isNull(schema.companies.deletedAt)))
      .limit(1);
    if (!existing) throw new NotFoundError("Perusahaan tidak ditemukan.");
    await tx
      .update(schema.companies)
      .set({ deletedAt: new Date(), deletedBy: userId })
      .where(eq(schema.companies.id, id));
  });
}
