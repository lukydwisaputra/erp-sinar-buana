/**
 * Pure DB-row <-> app-shape mapping for Penawaran (SPH), kept free of any DB
 * connection import so these functions stay unit-testable without a live
 * Postgres — see `src/lib/penawaran/service.ts` for the actual queries.
 *
 * RAB and Jadwal are tracked per SPH line item in the app (`sphItemSchema.rab`/
 * `.jadwal`) — each `quotation_rab_personnel`/`quotation_rab_direct_costs`/
 * `activity_schedules` row carries a nullable `quotationItemId` so they can be
 * regrouped back onto the right item on read (migrations 0005-0007).
 */
import type {
  quotations,
  quotationItems,
  quotationTermScheme,
  quotationRabPersonnel,
  quotationRabDirectCosts,
  activitySchedules,
  activityScheduleRows,
  activityScheduleMarkedWeeks,
} from "@/lib/db/schema";
import type { Sph, SphStatus, SphItem } from "@/lib/schemas/penawaran";

export type QuotationRow = typeof quotations.$inferSelect;
export type QuotationItemRow = typeof quotationItems.$inferSelect;
export type TermSchemeRow = typeof quotationTermScheme.$inferSelect;
export type RabPersonnelRow = typeof quotationRabPersonnel.$inferSelect;
export type RabDirectCostRow = typeof quotationRabDirectCosts.$inferSelect;
export type ScheduleRow = typeof activitySchedules.$inferSelect;
export type ScheduleRowRow = typeof activityScheduleRows.$inferSelect;
export type MarkedWeekRow = typeof activityScheduleMarkedWeeks.$inferSelect;

/** App enum <-> real `workflow_statuses.label` (entity='penawaran'). Keeps the
 * UI's 5-value enum (StatusBadge maps, filters, business logic in sph.ts)
 * unchanged while the DB stores a real, client-renameable status row. */
export const STATUS_LABEL_BY_ENUM: Record<SphStatus, string> = {
  draft: "Draft",
  terkirim: "Leads - Terkirim",
  deal: "Convert - Deal",
  ditolak: "Ditolak",
  dibatalkan: "Batal",
};
export const ENUM_BY_STATUS_LABEL: Record<string, SphStatus> = Object.fromEntries(
  Object.entries(STATUS_LABEL_BY_ENUM).map(([enumValue, label]) => [label, enumValue as SphStatus]),
);

function sortByOrder<T extends { sortOrder: number }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Reconstructs one item's `rab` from its RAB rows (already filtered to this item). */
function toItemRab(personnel: RabPersonnelRow[], directCosts: RabDirectCostRow[]): SphItem["rab"] {
  return {
    personil: sortByOrder(personnel).map((r) => ({
      uraian: r.role,
      vol: Number(r.volumeMonths),
      satuan: "bulan", // not a stored column — personnel cost is always months x rate
      hargaSatuan: Number(r.unitPrice),
    })),
    // quotation_rab_direct_costs has no vol/satuan/hargaSatuan breakdown, only
    // a flat `amount` — reconstructed as a single "1 paket" row. Round-tripping
    // a multi-unit direct cost (e.g. "3 trip @ Rp500rb") collapses its vol into
    // the total; this table is internal-only (PRD Bab 4.3), not client-facing.
    langsung: sortByOrder(directCosts).map((r) => ({
      uraian: r.description,
      vol: 1,
      satuan: "paket",
      hargaSatuan: Number(r.amount),
    })),
  };
}

/** Reconstructs one item's `jadwal` from its schedule (already matched by quotationItemId). */
function toItemJadwal(
  schedule: ScheduleRow | undefined,
  rows: ScheduleRowRow[],
  markedWeeksByRowId: Map<string, MarkedWeekRow[]>,
): SphItem["jadwal"] {
  if (!schedule) return { kegiatan: [], highlights: [], bulan: 1 };
  const sortedRows = sortByOrder(rows.filter((r) => r.scheduleId === schedule.id));
  return {
    bulan: schedule.numMonths,
    kegiatan: sortedRows.map((r) => r.activityName),
    highlights: sortedRows.map((r) =>
      (markedWeeksByRowId.get(r.id) ?? [])
        .filter((mw) => mw.isActual === 0)
        .map((mw) => mw.weekNumber)
        .sort((a, b) => a - b),
    ),
  };
}

export type ItemAssemblyInput = {
  items: QuotationItemRow[];
  rabPersonnel: RabPersonnelRow[];
  rabDirectCosts: RabDirectCostRow[];
  schedules: ScheduleRow[];
  scheduleRows: ScheduleRowRow[];
  markedWeeks: MarkedWeekRow[];
};

function toSphItems(input: ItemAssemblyInput): SphItem[] {
  const markedWeeksByRowId = new Map<string, MarkedWeekRow[]>();
  for (const mw of input.markedWeeks) {
    const list = markedWeeksByRowId.get(mw.rowId) ?? [];
    list.push(mw);
    markedWeeksByRowId.set(mw.rowId, list);
  }
  return sortByOrder(input.items).map((item) => {
    const schedule = input.schedules.find((s) => s.quotationItemId === item.id);
    return {
      layananId: item.serviceId ?? "",
      nama: item.description,
      volume: Number(item.quantity),
      harga: Number(item.unitPrice),
      satuan: item.unit ?? "Paket",
      rab: toItemRab(
        input.rabPersonnel.filter((r) => r.quotationItemId === item.id),
        input.rabDirectCosts.filter((r) => r.quotationItemId === item.id),
      ),
      jadwal: toItemJadwal(schedule, input.scheduleRows, markedWeeksByRowId),
    };
  });
}

export type ToSphInput = ItemAssemblyInput & {
  quotation: QuotationRow;
  companyName: string;
  companyAddress: string;
  termScheme: TermSchemeRow[];
  statusLabel: string | null;
};

export function toSph(input: ToSphInput): Sph {
  const q = input.quotation;
  return {
    id: q.id,
    number: q.number,
    status: (q.statusId && input.statusLabel ? ENUM_BY_STATUS_LABEL[input.statusLabel] : undefined) ?? "draft",
    perusahaanId: q.companyId,
    perusahaanNama: input.companyName,
    alamat: input.companyAddress,
    tanggal: q.date,
    masaBerlakuAktif: q.validityDays !== null,
    masaBerlakuHari: q.validityDays ?? 30,
    kalimatPembuka: q.openingSentence ?? "",
    lampiran: q.attachmentNote ?? "",
    rincianAktif: q.rincianActive,
    items: toSphItems(input),
    termin: sortByOrder(input.termScheme).map((t) => ({
      label: t.label,
      persen: Number(t.percentage),
      pemicu: t.milestoneTriggerLabel ?? "",
    })),
    catatan: q.notes ? q.notes.split("\n") : [],
    ppnAktif: q.ppnActive,
    ppnPersen: q.ppnPercent !== null ? Number(q.ppnPercent) : 12,
    pph23Aktif: q.pph23Active,
    pph23Persen: q.pph23Percent !== null ? Number(q.pph23Percent) : 2,
    jabatanPenerima: q.recipientTitle ?? "Direktur",
    picAktif: q.picOverrideActive,
    picNama: q.picOverrideName ?? "",
    picJabatan: q.picOverridePosition ?? "",
    kelengkapan: [], // Kelengkapan Administrasi stays mock/deferred — no DB table
  };
}

/** Column values (header only) for insert/update — items/RAB/jadwal/termin are
 * written separately by the service layer since they're child tables. */
export function quotationColumnsFromInput(input: {
  perusahaanId?: string;
  tanggal?: string;
  masaBerlakuAktif?: boolean;
  masaBerlakuHari?: number;
  kalimatPembuka?: string;
  lampiran?: string;
  rincianAktif?: boolean;
  catatan?: string[];
  ppnAktif?: boolean;
  ppnPersen?: number;
  pph23Aktif?: boolean;
  pph23Persen?: number;
  jabatanPenerima?: string;
  picAktif?: boolean;
  picNama?: string;
  picJabatan?: string;
}) {
  return {
    ...(input.perusahaanId !== undefined && { companyId: input.perusahaanId }),
    ...(input.tanggal !== undefined && { date: input.tanggal }),
    ...(input.masaBerlakuAktif !== undefined && {
      validityDays: input.masaBerlakuAktif ? (input.masaBerlakuHari ?? 30) : null,
    }),
    ...(input.kalimatPembuka !== undefined && { openingSentence: input.kalimatPembuka || null }),
    ...(input.lampiran !== undefined && { attachmentNote: input.lampiran || null }),
    ...(input.rincianAktif !== undefined && { rincianActive: input.rincianAktif }),
    ...(input.catatan !== undefined && { notes: input.catatan.join("\n") || null }),
    ...(input.ppnAktif !== undefined && { ppnActive: input.ppnAktif }),
    ...(input.ppnPersen !== undefined && { ppnPercent: String(input.ppnPersen) }),
    ...(input.pph23Aktif !== undefined && { pph23Active: input.pph23Aktif }),
    ...(input.pph23Persen !== undefined && { pph23Percent: String(input.pph23Persen) }),
    ...(input.jabatanPenerima !== undefined && { recipientTitle: input.jabatanPenerima || null }),
    ...(input.picAktif !== undefined && { picOverrideActive: input.picAktif }),
    ...(input.picNama !== undefined && { picOverrideName: input.picNama || null }),
    ...(input.picJabatan !== undefined && { picOverridePosition: input.picJabatan || null }),
  };
}
