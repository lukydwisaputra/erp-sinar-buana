import type { FakturTerminRow } from "@/lib/faktur/mapping";
import type { TaxEntry } from "@/lib/schemas/tax-entries";
import type { Proyek } from "@/lib/schemas/proyek";
import type { AlertItem, AlertJenis, AlertPrioritas, ProyekProfit } from "@/lib/dasbor/types";

// Proyek's status is now a config-driven workflow_statuses label (client can
// rename/reorder freely) — "active" (can still be "mangkrak"/stalled) means
// anything whose systemRole isn't a terminal SELESAI/BATAL, never a label
// match (PRD Bab 9.2: automation keys off systemRole, not label).
const TERMINAL_PROYEK_SYSTEM_ROLES = new Set(["SELESAI", "BATAL"]);
function isActiveProyek(p: Proyek): boolean {
  return !p.statusSystemRole || !TERMINAL_PROYEK_SYSTEM_ROLES.has(p.statusSystemRole);
}

export const FAKTUR_DUE_SOON_DAYS = 7;
export const PAJAK_DUE_SOON_DAYS = 3;

function daysDiff(a: string, b: string): number {
  const ms = new Date(b + "T00:00:00Z").getTime() - new Date(a + "T00:00:00Z").getTime();
  return Math.round(ms / 86_400_000);
}

function makeItem(
  id: string,
  jenis: AlertJenis,
  prioritas: AlertPrioritas,
  judul: string,
  detail: string,
  refId: string,
  refType: AlertItem["refType"],
  tanggal?: string,
): AlertItem {
  return { id, jenis, prioritas, judul, detail, refId, refType, ...(tanggal !== undefined && { tanggal }) };
}

export function alertsFaktur(fakturs: FakturTerminRow[], today: string): AlertItem[] {
  const items: AlertItem[] = [];
  for (const f of fakturs) {
    if (f.statusSystemRole !== null || !f.jatuhTempo) continue; // only unpaid, uncancelled termins can be overdue
    const diff = daysDiff(today, f.jatuhTempo);
    if (diff < 0) {
      items.push(makeItem(
        "faktur-terlambat-" + f.id, "faktur_terlambat", "tinggi",
        "Faktur Terlambat: " + f.id,
        f.perusahaanNama + " – jatuh tempo " + f.jatuhTempo,
        f.id, "faktur", f.jatuhTempo,
      ));
    } else if (diff <= FAKTUR_DUE_SOON_DAYS) {
      items.push(makeItem(
        "faktur-jatuh-tempo-" + f.id, "faktur_jatuh_tempo", "sedang",
        "Faktur Jatuh Tempo: " + f.id,
        f.perusahaanNama + " – jatuh tempo " + f.jatuhTempo,
        f.id, "faktur", f.jatuhTempo,
      ));
    }
  }
  return items;
}

export function alertsPajak(kewajiban: TaxEntry[], today: string): AlertItem[] {
  const items: AlertItem[] = [];
  for (const k of kewajiban) {
    if (k.settlementStatus !== "sudah_disetor" && k.dueDate) {
      const diff = daysDiff(today, k.dueDate);
      if (diff < 0) {
        items.push(makeItem(
          "pajak-terlambat-" + k.id, "pajak_terlambat", "tinggi",
          "Pajak Terlambat: " + k.taxType.toUpperCase() + " " + k.taxPeriod.slice(0, 7),
          "Jatuh tempo " + k.dueDate + ", belum disetor",
          k.id, "pajak", k.dueDate,
        ));
      } else if (diff <= PAJAK_DUE_SOON_DAYS) {
        items.push(makeItem(
          "pajak-jatuh-tempo-" + k.id, "pajak_jatuh_tempo", "sedang",
          "Pajak Jatuh Tempo: " + k.taxType.toUpperCase() + " " + k.taxPeriod.slice(0, 7),
          "Jatuh tempo " + k.dueDate,
          k.id, "pajak", k.dueDate,
        ));
      }
    }
    if (k.taxType === "pph23_dipotong" && !k.buktiPotongReceived) {
      items.push(makeItem(
        "bukti-potong-" + k.id, "bukti_potong_belum", "sedang",
        "Bukti Potong PPh 23 Belum Diterima",
        "Periode " + k.taxPeriod.slice(0, 7) + " – PPh 23 credit berisiko",
        k.id, "pajak", k.dueDate ?? undefined,
      ));
    }
  }
  return items;
}

export function alertsProyek(proyek: ProyekProfit[]): AlertItem[] {
  const items: AlertItem[] = [];
  for (const p of proyek) {
    if (p.kesehatan === "merah") {
      items.push(makeItem(
        "proyek-over-budget-" + p.proyekId, "proyek_over_budget", "tinggi",
        "Proyek Melebihi Anggaran: " + p.proyekNama,
        "Realisasi melebihi RAB rencana",
        p.proyekId, "proyek",
      ));
    } else if (p.kesehatan === "kuning") {
      items.push(makeItem(
        "proyek-margin-slip-" + p.proyekId, "proyek_margin_slip", "sedang",
        "Margin Proyek Menurun: " + p.proyekNama,
        "Margin aktual di bawah rencana",
        p.proyekId, "proyek",
      ));
    }
  }
  return items;
}

/** Last known activity on a project: most recent milestone actualDate, else createdAt. */
export function lastActivityDate(p: Proyek): string {
  const actuals = p.milestones.map((m) => m.actualDate).filter((d): d is string => !!d);
  return actuals.length > 0 ? actuals.sort().at(-1)! : p.createdAt.slice(0, 10);
}

export function alertsProyekMangkrak(proyeks: Proyek[], today: string, ambangHari: number): AlertItem[] {
  const items: AlertItem[] = [];
  for (const p of proyeks) {
    if (!isActiveProyek(p)) continue; // selesai/dibatalkan can never be "stalled"
    const last = lastActivityDate(p);
    const diff = daysDiff(last, today);
    if (diff >= ambangHari) {
      items.push(makeItem(
        "proyek-mangkrak-" + p.id, "proyek_mangkrak", "sedang",
        "Proyek Mangkrak: " + p.nama,
        "Tidak ada progres milestone sejak " + last + " (" + diff + " hari)",
        p.id, "proyek", last,
      ));
    }
  }
  return items;
}

export function computeAlerts(args: {
  fakturs: FakturTerminRow[];
  kewajiban: TaxEntry[];
  proyek: ProyekProfit[];
  proyeks: Proyek[];
  today: string;
  ambangMangkrakHari: number;
}): AlertItem[] {
  const all = [
    ...alertsFaktur(args.fakturs, args.today),
    ...alertsPajak(args.kewajiban, args.today),
    ...alertsProyek(args.proyek),
    ...alertsProyekMangkrak(args.proyeks, args.today, args.ambangMangkrakHari),
  ];
  return all.sort((a, b) => {
    if (a.prioritas !== b.prioritas) {
      return a.prioritas === "tinggi" ? -1 : 1;
    }
    if (a.tanggal && b.tanggal) return a.tanggal.localeCompare(b.tanggal);
    if (a.tanggal) return -1;
    if (b.tanggal) return 1;
    return 0;
  });
}
