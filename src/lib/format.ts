import { format as formatDateFns } from "date-fns";
import { id as idLocale } from "date-fns/locale";

/** Locale-agnostic thousands separator (dot, Indonesian style). SSR-safe. */
export function formatIntIDR(n: number): string {
  return Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** 0-indexed → bijective base-26 letter label: a, b, ... z, aa, ab, ... —
 * used for checklist row markers so item #27 reads "aa." instead of the
 * raw charCode symbol past 'z'. */
export function alphaLabel(i: number): string {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    n -= 1;
    s = String.fromCharCode(97 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

/** "baru saja" / "12 menit lalu" / "3 jam lalu", falling back to a full date
 * past 24h — shared by the milestone activity feed and the notification bell. */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return formatDateFns(new Date(iso), "d MMM yyyy, HH:mm", { locale: idLocale });
}

/** "2026-07-03" → "3 Juli 2026". Empty/falsy input returns "—". */
export function formatTanggalPanjang(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/** Title-case a space-separated string — e.g. for capitalizing `terbilang()` output. */
export function titleCase(s: string): string {
  return s.replace(/\S+/g, (w) => w.charAt(0).toUpperCase() + w.slice(1));
}

export function formatRupiah(value: number): string {
  const rounded = Math.round(value);
  return `${rounded < 0 ? "-" : ""}Rp ${formatIntIDR(rounded)}`;
}

export function parseRupiah(input: string): number {
  const digits = input.replace(/[^\d-]/g, "");
  const n = Number.parseInt(digits, 10);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * Compact IDR for tight spaces (KPI tiles): keeps the value on one line.
 * e.g. 1_250_000_000 → "Rp 1,25 M", 145_000_000 → "Rp 145 jt", 0 → "Rp 0".
 */
export function formatRupiahCompact(value: number): string {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  const scaled = (n: number, suffix: string) => {
    const s = n.toFixed(3).replace(/\.?0+$/, "").replace(".", ",");
    return `${sign}Rp ${s} ${suffix}`;
  };
  if (abs >= 1_000_000_000_000) return scaled(abs / 1_000_000_000_000, "T");
  if (abs >= 1_000_000_000) return scaled(abs / 1_000_000_000, "M");
  if (abs >= 1_000_000) return scaled(abs / 1_000_000, "jt");
  if (abs >= 1_000) return scaled(abs / 1_000, "rb");
  return `${sign}Rp ${abs}`;
}
