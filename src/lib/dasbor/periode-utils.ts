import type { Periode } from "@/lib/dasbor/types";

export type PeriodePreset = "mtd" | "qtd" | "ytd";

export const PRESET_LABELS: Record<PeriodePreset, string> = {
  mtd: "Bulan Ini",
  qtd: "Kuartal Ini",
  ytd: "Tahun Ini",
};

/**
 * Get the date range for a preset period based on today's date.
 * Uses ISO yyyy-mm-dd format (UTC).
 */
export function periodePreset(preset: PeriodePreset): Periode {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1; // 0-indexed
  const date = today.getDate();

  const pad = (n: number) => String(n).padStart(2, "0");

  if (preset === "mtd") {
    // Month-to-date: 1st of this month to today
    return {
      mulai: `${year}-${pad(month)}-01`,
      selesai: `${year}-${pad(month)}-${pad(date)}`,
    };
  }

  if (preset === "qtd") {
    // Quarter-to-date
    const quarter = Math.ceil(month / 3);
    const quarterStart = (quarter - 1) * 3 + 1;
    return {
      mulai: `${year}-${pad(quarterStart)}-01`,
      selesai: `${year}-${pad(month)}-${pad(date)}`,
    };
  }

  // ytd: Year-to-date: 1st of January to today
  return {
    mulai: `${year}-01-01`,
    selesai: `${year}-${pad(month)}-${pad(date)}`,
  };
}
