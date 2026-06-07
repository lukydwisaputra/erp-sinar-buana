export function formatRupiah(value: number): string {
  const rounded = Math.round(value);
  const abs = Math.abs(rounded).toLocaleString("id-ID");
  return `${rounded < 0 ? "-" : ""}Rp ${abs}`;
}

export function parseRupiah(input: string): number {
  const digits = input.replace(/[^\d-]/g, "");
  const n = Number.parseInt(digits, 10);
  return Number.isNaN(n) ? 0 : n;
}
