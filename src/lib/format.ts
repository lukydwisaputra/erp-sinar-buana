/** Locale-agnostic thousands separator (dot, Indonesian style). SSR-safe. */
export function formatIntIDR(n: number): string {
  return Math.abs(Math.round(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
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
