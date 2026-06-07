import type { Perusahaan } from "@/lib/schemas/perusahaan";

export const perusahaanFixtures: Perusahaan[] = [
  { id: "PRSH-001", nama: "PT Maju Bersama Industri", npwp: "01.234.567.8-901.000", pic: "Andi Wijaya", telepon: "021-5550101", email: "andi@majubersama.co.id", kota: "Jakarta", status: "aktif" },
  { id: "PRSH-002", nama: "CV Sumber Rejeki Pangan", npwp: "02.345.678.9-012.000", pic: "Siti Rahayu", telepon: "022-5550202", email: "siti@sumberrejeki.co.id", kota: "Bandung", status: "aktif" },
  { id: "PRSH-003", nama: "PT Karya Logam Nusantara", npwp: "03.456.789.0-123.000", pic: "Budi Santoso", telepon: "031-5550303", email: "budi@karyalogam.co.id", kota: "Surabaya", status: "aktif" },
  { id: "PRSH-004", nama: "PT Hijau Lestari Permai", npwp: "04.567.890.1-234.000", pic: "Dewi Lestari", telepon: "024-5550404", email: "dewi@hijaulestari.co.id", kota: "Semarang", status: "nonaktif" },
  { id: "PRSH-005", nama: "CV Bahari Sentosa", npwp: "05.678.901.2-345.000", pic: "Rudi Hartono", telepon: "0361-5550505", email: "rudi@baharisentosa.co.id", kota: "Denpasar", status: "aktif" },
  { id: "PRSH-006", nama: "PT Cahaya Teknik Mandiri", npwp: "06.789.012.3-456.000", pic: "Maya Putri", telepon: "061-5550606", email: "maya@cahayateknik.co.id", kota: "Medan", status: "aktif" },
];
