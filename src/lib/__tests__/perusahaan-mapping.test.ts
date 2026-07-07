import { describe, it, expect } from "vitest";
import { computeMetrik, toContactRows, toPerusahaan } from "@/lib/perusahaan/mapping";
import { seedPerusahaanId } from "@/lib/perusahaan-seed-ids";

function company(overrides: Partial<Parameters<typeof toPerusahaan>[0]> = {}) {
  return {
    id: seedPerusahaanId(1),
    name: "PT Contoh",
    address: "Jl. Contoh No. 1",
    city: "Jakarta",
    regency: "Kota Jakarta Selatan",
    adminAreaId: null,
    country: "Indonesia",
    npwp: "0123456789010000",
    email: "info@contoh.co.id",
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  };
}

function contact(overrides: Partial<Parameters<typeof toPerusahaan>[1][number]> = {}) {
  return {
    id: "contact-1",
    companyId: seedPerusahaanId(1),
    name: "Budi",
    phone: "0812-0000-0001",
    email: "budi@contoh.co.id",
    position: "Direktur",
    isPrimary: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    ...overrides,
  };
}

describe("toPerusahaan", () => {
  it("maps is_active true to status 'aktif'", () => {
    expect(toPerusahaan(company({ isActive: true }), [], 0, 0, 0, 0).status).toBe("aktif");
  });

  it("maps is_active false to status 'nonaktif'", () => {
    expect(toPerusahaan(company({ isActive: false }), [], 0, 0, 0, 0).status).toBe("nonaktif");
  });

  it("sorts contacts so the primary PIC is first", () => {
    const rows = [
      contact({ id: "c1", name: "Sekunder", isPrimary: false }),
      contact({ id: "c2", name: "Utama", isPrimary: true }),
    ];
    const result = toPerusahaan(company(), rows, 0, 0, 0, 0);
    expect(result.pic[0].nama).toBe("Utama");
  });

  it("falls back to empty strings for nullable contact fields", () => {
    const rows = [contact({ position: null, email: null })];
    const result = toPerusahaan(company(), rows, 0, 0, 0, 0);
    expect(result.pic[0].jabatan).toBe("");
    expect(result.pic[0].email).toBe("");
  });

  it("passes through the real jumlahPenawaran/proyekAktif/nilaiKontrak/piutang counts", () => {
    const result = toPerusahaan(company(), [], 5, 2, 150_000_000, 25_000_000);
    expect(result.metrik.jumlahPenawaran).toBe(5);
    expect(result.metrik.proyekAktif).toBe(2);
    expect(result.metrik.nilaiKontrak).toBe(150_000_000);
    expect(result.metrik.piutang).toBe(25_000_000);
  });
});

describe("toContactRows", () => {
  it("marks only the first PIC as primary", () => {
    const rows = toContactRows(
      [
        { nama: "A", jabatan: "Direktur", telepon: "0811", email: "a@x.co.id" },
        { nama: "B", jabatan: "Manajer", telepon: "0812", email: "b@x.co.id" },
      ],
      "company-1",
    );
    expect(rows[0].isPrimary).toBe(true);
    expect(rows[1].isPrimary).toBe(false);
  });

  it("stores blank jabatan/email as null, not empty string", () => {
    const [row] = toContactRows(
      [{ nama: "A", jabatan: "", telepon: "0811", email: "" }],
      "company-1",
    );
    expect(row.position).toBeNull();
    expect(row.email).toBeNull();
  });
});

describe("computeMetrik", () => {
  it("returns zeroed metrik when every count is 0", () => {
    const metrik = computeMetrik(0, 0, 0, 0);
    expect(metrik).toEqual({ jumlahPenawaran: 0, proyekAktif: 0, nilaiKontrak: 0, piutang: 0 });
  });

  it("passes through the given jumlahPenawaran/proyekAktif/nilaiKontrak/piutang counts", () => {
    const metrik = computeMetrik(4, 2, 150_000_000, 25_000_000);
    expect(metrik.jumlahPenawaran).toBe(4);
    expect(metrik.proyekAktif).toBe(2);
    expect(metrik.nilaiKontrak).toBe(150_000_000);
    expect(metrik.piutang).toBe(25_000_000);
  });
});
