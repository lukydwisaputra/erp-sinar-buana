import { and, asc, desc, eq, isNull } from "drizzle-orm";
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
    return companies.map((c) => toPerusahaan(c, contactsByCompany.get(c.id) ?? []));
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
    return toPerusahaan(company, contacts);
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
    return toPerusahaan(company, contacts);
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
    return toPerusahaan(company, contacts);
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
