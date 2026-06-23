import type { Faktur } from "@/lib/schemas/faktur";
import type { KewajibanPajak } from "@/lib/schemas/kewajiban-pajak";
import type { AlertItem, AlertJenis, AlertPrioritas, ProyekProfit } from "@/lib/dasbor/types";

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

export function alertsFaktur(fakturs: Faktur[], today: string): AlertItem[] {
  const items: AlertItem[] = [];
  for (const f of fakturs) {
    if (f.status !== "terkirim") continue;
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

export function alertsPajak(kewajiban: KewajibanPajak[], today: string): AlertItem[] {
  const items: AlertItem[] = [];
  for (const k of kewajiban) {
    if (k.status === "belum_setor") {
      const diff = daysDiff(today, k.jatuhTempo);
      if (diff < 0) {
        items.push(makeItem(
          "pajak-terlambat-" + k.id, "pajak_terlambat", "tinggi",
          "Pajak Terlambat: " + k.jenis.toUpperCase() + " " + k.periode,
          "Jatuh tempo " + k.jatuhTempo + ", belum disetor",
          k.id, "pajak", k.jatuhTempo,
        ));
      } else if (diff <= PAJAK_DUE_SOON_DAYS) {
        items.push(makeItem(
          "pajak-jatuh-tempo-" + k.id, "pajak_jatuh_tempo", "sedang",
          "Pajak Jatuh Tempo: " + k.jenis.toUpperCase() + " " + k.periode,
          "Jatuh tempo " + k.jatuhTempo,
          k.id, "pajak", k.jatuhTempo,
        ));
      }
    }
    if (k.jenis === "pph23" && !k.buktiPotongDiterima) {
      items.push(makeItem(
        "bukti-potong-" + k.id, "bukti_potong_belum", "sedang",
        "Bukti Potong PPh 23 Belum Diterima",
        "Periode " + k.periode + " – PPh 23 credit berisiko",
        k.id, "pajak", k.jatuhTempo,
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

export function computeAlerts(args: {
  fakturs: Faktur[];
  kewajiban: KewajibanPajak[];
  proyek: ProyekProfit[];
  today: string;
}): AlertItem[] {
  const all = [
    ...alertsFaktur(args.fakturs, args.today),
    ...alertsPajak(args.kewajiban, args.today),
    ...alertsProyek(args.proyek),
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
