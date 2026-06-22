import type { Periode } from "@/lib/dasbor/types";

/**
 * Inclusive membership test. ISO yyyy-mm-dd strings compare lexicographically,
 * so plain string comparison is correct. Empty dates are never members.
 */
export function dalamPeriode(tanggal: string, periode: Periode): boolean {
  if (!tanggal) return false;
  return tanggal >= periode.mulai && tanggal <= periode.selesai;
}
