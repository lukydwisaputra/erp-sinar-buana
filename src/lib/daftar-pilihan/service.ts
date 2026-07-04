import { asc, eq } from "drizzle-orm";
import type { PgTableWithColumns } from "drizzle-orm/pg-core";
import { withUserTransaction, type Tx } from "@/lib/db/tx";
import { schema } from "@/lib/db/client";
import { NotFoundError, ConflictError } from "@/lib/api-error";
import { toOptionItem, extraToColumns } from "@/lib/daftar-pilihan/mapping";
import type {
  DaftarPilihanKategori,
  OptionItem,
  OptionExtra,
} from "@/lib/schemas/daftar-pilihan";

export { toOptionItem, extraToColumns } from "@/lib/daftar-pilihan/mapping";

/**
 * Each of the 8 categories is backed by its own table (see mapping.ts's
 * doc comment). Reads/writes here dispatch on `kategori` to the right table;
 * the return type is intentionally loose (`PgTableWithColumns<any>`) because
 * Drizzle can't unify 8 structurally-different tables under one generic
 * `.insert()/.update()` call — the column names actually written are still
 * fully typed and checked at the `extraToColumns`/mapping.ts boundary.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- see doc comment above
function tableFor(kategori: DaftarPilihanKategori): PgTableWithColumns<any> {
  switch (kategori) {
    case "jenis_dokumen": return schema.documentTypes;
    case "kewenangan": return schema.authorities;
    case "dasar_hukum": return schema.legalBases;
    case "area_kawasan": return schema.adminAreas;
    case "jabatan": return schema.positions;
    case "status_kepegawaian": return schema.employmentStatuses;
    case "komponen_gaji": return schema.salaryComponents;
    case "rekening_bank": return schema.bankAccounts;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows come from tableFor()'s loosely-typed union table
function mapRows(kategori: DaftarPilihanKategori, rows: any[]): OptionItem[] {
  return rows.map((row) => toOptionItem(kategori, row));
}

async function loadRow(tx: Tx, kategori: DaftarPilihanKategori, id: string) {
  const table = tableFor(kategori);
  const [row] = await tx.select().from(table).where(eq(table.id, id)).limit(1);
  return row;
}

export async function listOptions(
  userId: string,
  kategori: DaftarPilihanKategori,
  opts: { includeInactive?: boolean } = {},
): Promise<OptionItem[]> {
  return withUserTransaction(userId, async (tx) => {
    const table = tableFor(kategori);
    const base = tx.select().from(table);
    const rows = opts.includeInactive
      ? await base.orderBy(asc(table.sortOrder))
      : await base.where(eq(table.isActive, true)).orderBy(asc(table.sortOrder));
    return mapRows(kategori, rows);
  });
}

export async function createOption(
  userId: string,
  kategori: DaftarPilihanKategori,
  nama: string,
  extra: OptionExtra = {},
): Promise<OptionItem> {
  return withUserTransaction(userId, async (tx) => {
    const table = tableFor(kategori);
    const rows: { label: string; sortOrder: number }[] = await tx
      .select({ label: table.label, sortOrder: table.sortOrder })
      .from(table);
    if (rows.some((r) => r.label.toLowerCase() === nama.trim().toLowerCase())) {
      throw new ConflictError("Item dengan nama ini sudah ada.");
    }
    const nextOrder = rows.length ? Math.max(...rows.map((r) => r.sortOrder)) + 1 : 1;
    const [row] = await tx
      .insert(table)
      .values({ label: nama.trim(), sortOrder: nextOrder, isActive: true, ...extraToColumns(kategori, extra) })
      .returning();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- row shape depends on kategori, narrowed inside toOptionItem
    return toOptionItem(kategori, row as any);
  });
}

export async function updateOption(
  userId: string,
  kategori: DaftarPilihanKategori,
  id: string,
  patch: Partial<Pick<OptionItem, "nama" | "aktif" | "extra">>,
): Promise<OptionItem> {
  return withUserTransaction(userId, async (tx) => {
    const table = tableFor(kategori);
    const existing = await loadRow(tx, kategori, id);
    if (!existing) throw new NotFoundError(`Item ${id} tidak ditemukan.`);
    const [row] = await tx
      .update(table)
      .set({
        ...(patch.nama !== undefined && { label: patch.nama }),
        ...(patch.aktif !== undefined && { isActive: patch.aktif }),
        ...(patch.extra !== undefined && extraToColumns(kategori, patch.extra)),
      })
      .where(eq(table.id, id))
      .returning();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- row shape depends on kategori, narrowed inside toOptionItem
    return toOptionItem(kategori, row as any);
  });
}

export async function deleteOption(
  userId: string,
  kategori: DaftarPilihanKategori,
  id: string,
): Promise<void> {
  await withUserTransaction(userId, async (tx) => {
    const table = tableFor(kategori);
    await tx.delete(table).where(eq(table.id, id));
  });
}

export async function moveOption(
  userId: string,
  kategori: DaftarPilihanKategori,
  id: string,
  direction: "up" | "down",
): Promise<OptionItem[]> {
  return withUserTransaction(userId, async (tx) => {
    const table = tableFor(kategori);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- rows come from tableFor()'s loosely-typed union table
    const siblings: any[] = await tx.select().from(table).orderBy(asc(table.sortOrder));
    const idx = siblings.findIndex((s) => s.id === id);
    if (idx === -1) throw new NotFoundError(`Item ${id} tidak ditemukan.`);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) {
      return mapRows(kategori, siblings);
    }
    const a = siblings[idx];
    const b = siblings[swapIdx];
    await tx.update(table).set({ sortOrder: b.sortOrder }).where(eq(table.id, a.id));
    await tx.update(table).set({ sortOrder: a.sortOrder }).where(eq(table.id, b.id));
    [siblings[idx].sortOrder, siblings[swapIdx].sortOrder] = [b.sortOrder, a.sortOrder];
    return mapRows(kategori, [...siblings].sort((x, y) => x.sortOrder - y.sortOrder));
  });
}
