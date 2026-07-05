/**
 * Pure DB-row <-> app-shape mapping for Realisasi RAB, kept free of any DB
 * connection import — see `src/lib/realisasi-rab/service.ts` for the queries.
 */
import type { rabActuals } from "@/lib/db/schema";
import type { RealisasiRab, RabKategori } from "@/lib/schemas/realisasi-rab";

export type RabActualRow = typeof rabActuals.$inferSelect;

const KATEGORI_BY_RAB_CATEGORY: Record<string, RabKategori> = {
  personil_a: "personil",
  langsung_b: "langsung",
};
export const RAB_CATEGORY_BY_KATEGORI: Record<RabKategori, "personil_a" | "langsung_b"> = {
  personil: "personil_a",
  langsung: "langsung_b",
};

export function toRealisasiRab(row: RabActualRow): RealisasiRab {
  return {
    id: row.id,
    proyekId: row.projectId,
    kategori: KATEGORI_BY_RAB_CATEGORY[row.rabCategory] ?? "personil",
    rabLineLabel: row.rabLineLabel ?? "",
    jumlah: Number(row.amount),
    tanggal: row.date,
    keterangan: row.note ?? "",
    // cashflow_entry_id stays unset — Arus Kas isn't wired yet (see
    // src/lib/db/schema.ts's rabActuals mirror, which omits the column).
    arusKasId: undefined,
  };
}
