/**
 * Pure DB-row ↔ app-shape mapping for Perusahaan, kept free of any DB
 * connection import (`@/lib/db/client` reads `DATABASE_URL` at import time)
 * so these functions stay unit-testable without a live Postgres — see
 * `src/lib/perusahaan/service.ts` for the actual queries.
 */
import { penawaranFixtures } from "@/lib/fixtures/penawaran";
import { proyekFixtures } from "@/lib/fixtures/proyek";
import { fakturFixtures } from "@/lib/fixtures/faktur";
import { companies, companyContacts } from "@/lib/db/schema";
import type {
  Perusahaan,
  CreatePerusahaanInput,
} from "@/lib/schemas/perusahaan";

export type CompanyRow = typeof companies.$inferSelect;
export type ContactRow = typeof companyContacts.$inferSelect;

// Proyek/Faktur aren't wired to the real backend yet, so `metrik` keeps
// cross-referencing their mock fixtures by company id — see
// src/lib/perusahaan-seed-ids.ts for how those fixtures stay in sync with
// the real seeded company rows.
const ACTIVE_PROYEK_STATUSES = new Set(["on_track", "terlambat", "belum_mulai"]);

export function computeMetrik(companyId: string): Perusahaan["metrik"] {
  const jumlahPenawaran = penawaranFixtures.filter((s) => s.perusahaanId === companyId).length;

  const proyekPerusahaan = proyekFixtures.filter((p) => p.perusahaanId === companyId);
  const proyekAktif = proyekPerusahaan.filter((p) => ACTIVE_PROYEK_STATUSES.has(p.status)).length;
  const nilaiKontrak = proyekPerusahaan.reduce((s, p) => s + p.nilaiKontrak, 0);

  const piutang = fakturFixtures
    .filter((f) => f.perusahaanId === companyId && f.status === "terkirim")
    .reduce((sum, f) => {
      const subtotal = f.items.reduce((s, it) => s + it.volume * it.harga, 0);
      const termin = f.terminList[f.terminIndex];
      if (!termin) return sum;
      const nilaiTermin = (termin.persen / 100) * subtotal;
      const dpp = (11 / 12) * nilaiTermin;
      const ppn = f.ppnAktif ? Math.round((f.ppnPersen / 100) * dpp) : 0;
      const pph23 = f.pph23Aktif ? (f.pph23Persen / 100) * nilaiTermin : 0;
      return sum + nilaiTermin + ppn - pph23;
    }, 0);

  return { jumlahPenawaran, proyekAktif, nilaiKontrak, piutang };
}

/** First contact by is_primary (desc), then insertion order — matches the
 * "first PIC in the array is primary" convention `toContactRows` writes. */
function sortContacts(contacts: ContactRow[]): ContactRow[] {
  return [...contacts].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

export function toPerusahaan(company: CompanyRow, contacts: ContactRow[]): Perusahaan {
  return {
    id: company.id,
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
    metrik: computeMetrik(company.id),
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
