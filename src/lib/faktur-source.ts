import { penawaranFixtures } from "@/lib/fixtures/penawaran";
import { perusahaanFixtures } from "@/lib/fixtures/perusahaan";
import type { FakturFormValues } from "@/lib/schemas/faktur";

/** SPHs eligible to be invoiced — only those that have converted to a deal. */
export const dealSphOptions = penawaranFixtures.filter((s) => s.status === "deal");

/**
 * Build the deal-derived part of a faktur from a deal SPH: client, full
 * contract line items, and termin schedule. Returns null when the id is not a
 * deal SPH (a faktur may only be issued from a deal Penawaran).
 */
export function fakturValuesFromSph(sphId: string): Partial<FakturFormValues> | null {
  const sph = penawaranFixtures.find((s) => s.id === sphId && s.status === "deal");
  if (!sph) return null;
  const p = perusahaanFixtures.find((o) => o.id === sph.perusahaanId);
  return {
    sphId: sph.id,
    perusahaanId: sph.perusahaanId,
    perusahaanNama: sph.perusahaanNama,
    alamat: sph.alamat,
    kota: p?.kota ?? "",
    npwp: p?.npwp ?? "",
    items: sph.items.map((it) => ({ uraian: it.nama, volume: it.volume, harga: it.harga, satuan: it.satuan })),
    terminList: sph.termin.length ? sph.termin : [{ label: "Termin I", persen: 100, pemicu: "Pelunasan" }],
  };
}
