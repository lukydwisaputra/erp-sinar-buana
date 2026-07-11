/**
 * Pure DB-row ↔ app-shape mapping for Perusahaan, kept free of any DB
 * connection import (`@/lib/db/client` reads `DATABASE_URL` at import time)
 * so these functions stay unit-testable without a live Postgres — see
 * `src/lib/perusahaan/service.ts` for the actual queries.
 */
import { companies, companyContacts } from "@/lib/db/schema";
import type {
  Perusahaan,
  CreatePerusahaanInput,
} from "@/lib/schemas/perusahaan";

export type CompanyRow = typeof companies.$inferSelect;
export type ContactRow = typeof companyContacts.$inferSelect;

// `jumlahPenawaran`/`proyekAktif`/`nilaiKontrak`/`piutang` are all real
// counts/sums now (Penawaran, Proyek, and Faktur are wired) — see
// src/lib/perusahaan/service.ts, which queries them and passes them in here
// rather than reading a frozen mock array.
export function computeMetrik(jumlahPenawaran: number, proyekAktif: number, nilaiKontrak: number, piutang: number): Perusahaan["metrik"] {
  return { jumlahPenawaran, proyekAktif, nilaiKontrak, piutang };
}

/** First contact by is_primary (desc), then insertion order — matches the
 * "first PIC in the array is primary" convention `toContactRows` writes. */
function sortContacts(contacts: ContactRow[]): ContactRow[] {
  return [...contacts].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

export function toPerusahaan(
  company: CompanyRow,
  contacts: ContactRow[],
  jumlahPenawaran: number,
  proyekAktif: number,
  nilaiKontrak: number,
  piutang: number,
): Perusahaan {
  return {
    id: company.id,
    number: company.number,
    nama: company.name,
    npwp: company.npwp,
    alamat: company.address,
    kota: company.city,
    kabupaten: company.regency,
    email: company.email,
    status: company.isActive ? "aktif" : "nonaktif",
    pic: sortContacts(contacts).map((c) => ({
      nama: c.name,
      jabatan: c.position ?? "",
      telepon: c.phone,
      email: c.email ?? "",
    })),
    metrik: computeMetrik(jumlahPenawaran, proyekAktif, nilaiKontrak, piutang),
  };
}

export function toContactRows(pic: CreatePerusahaanInput["pic"], companyId: string) {
  return pic.map((p, i) => ({
    companyId,
    name: p.nama,
    phone: p.telepon,
    email: p.email || null,
    position: p.jabatan || null,
    isPrimary: i === 0,
  }));
}
