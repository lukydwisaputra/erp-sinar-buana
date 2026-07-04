/**
 * One-time bootstrap: inserts the 20 demo companies (+ PICs) that the still
 * mock-fixture modules (Penawaran, Proyek, Faktur) cross-reference by id, so
 * Perusahaan's computed `metrik` and those modules' company-name lookups keep
 * resolving once Perusahaan is served from real Postgres instead of fixtures.
 * Idempotent — re-running skips companies that already exist.
 *
 * Standalone by design (no `@/` imports, only relative ones) so it runs with
 * plain `node` (Node 26 strips TS types natively) without needing a bundler
 * to resolve path aliases — same convention as scripts/seed-admin.ts.
 * Run: node --env-file=.env.local scripts/seed-perusahaan.ts
 */
import postgres from "postgres";
import { seedPerusahaanId } from "../src/lib/perusahaan-seed-ids.ts";

type Pic = { nama: string; jabatan: string; telepon: string; email: string };
type Company = {
  id: string;
  nama: string;
  npwp: string;
  alamat: string;
  kota: string;
  kabupaten: string;
  email: string;
  isActive: boolean;
  pic: Pic[];
};

// Mirrors src/lib/fixtures/perusahaan.ts — kept in sync by hand since that
// file imports via `@/` aliases this standalone script can't resolve.
const companies: Company[] = [
  { id: seedPerusahaanId(1), nama: "PT Maju Bersama Industri", npwp: "0123456789010000",
    alamat: "Gedung Menara Sentosa Lantai 12, Jl. Jenderal Gatot Subroto Kav. 21-22, Kuningan Timur, Setiabudi, Jakarta Selatan 12950",
    kota: "Jakarta", kabupaten: "Kota Jakarta Selatan", email: "info@majubersama.co.id", isActive: true,
    pic: [
      { nama: "Andi Wijaya", jabatan: "Direktur Operasional", telepon: "0812-1100-2201", email: "andi@majubersama.co.id" },
      { nama: "Rina Kusuma", jabatan: "Manajer Lingkungan", telepon: "0812-1100-2202", email: "rina@majubersama.co.id" },
      { nama: "Hendra Gunawan", jabatan: "Staf Teknik", telepon: "0812-1100-2203", email: "hendra@majubersama.co.id" },
    ] },
  { id: seedPerusahaanId(2), nama: "CV Sumber Rejeki Pangan", npwp: "0234567890120000",
    alamat: "Jl. Soekarno Hatta No. 88, Kiaracondong", kota: "Bandung", kabupaten: "Kota Bandung",
    email: "admin@sumberrejeki.co.id", isActive: true,
    pic: [
      { nama: "Siti Rahayu", jabatan: "Pemilik", telepon: "0813-2200-3301", email: "siti@sumberrejeki.co.id" },
      { nama: "Bayu Pratama", jabatan: "Kepala Produksi", telepon: "0813-2200-3302", email: "bayu@sumberrejeki.co.id" },
    ] },
  { id: seedPerusahaanId(3), nama: "PT Karya Logam Nusantara Sejahtera Abadi Makmur", npwp: "0345678901230000",
    alamat: "Kawasan Industri SIER Blok C-4", kota: "Surabaya", kabupaten: "Kota Surabaya",
    email: "contact@karyalogam.co.id", isActive: true,
    pic: [{ nama: "Budi Santoso", jabatan: "General Manager", telepon: "0814-3300-4401", email: "budi@karyalogam.co.id" }] },
  { id: seedPerusahaanId(4), nama: "PT Hijau Lestari Permai", npwp: "0456789012340000",
    alamat: "Jl. Pemuda No. 45, Semarang Tengah", kota: "Semarang", kabupaten: "Kota Semarang",
    email: "info@hijaulestari.co.id", isActive: false,
    pic: [
      { nama: "Dewi Lestari", jabatan: "Direktur Utama", telepon: "0815-4400-5501", email: "dewi@hijaulestari.co.id" },
      { nama: "Agus Salim", jabatan: "Sekretaris Perusahaan", telepon: "0815-4400-5502", email: "agus@hijaulestari.co.id" },
    ] },
  { id: seedPerusahaanId(5), nama: "CV Bahari Sentosa", npwp: "0567890123450000",
    alamat: "Jl. Bypass Ngurah Rai No. 200, Sanur", kota: "Denpasar", kabupaten: "Kota Denpasar",
    email: "admin@baharisentosa.co.id", isActive: true,
    pic: [
      { nama: "Rudi Hartono", jabatan: "Pemilik", telepon: "0816-5500-6601", email: "rudi@baharisentosa.co.id" },
      { nama: "Komang Ayu", jabatan: "Administrasi", telepon: "0816-5500-6602", email: "komang@baharisentosa.co.id" },
    ] },
  { id: seedPerusahaanId(6), nama: "PT Cahaya Teknik Mandiri", npwp: "0678901234560000",
    alamat: "Jl. Sisingamangaraja No. 17, Medan Kota", kota: "Medan", kabupaten: "Kota Medan",
    email: "info@cahayateknik.co.id", isActive: true,
    pic: [
      { nama: "Maya Putri", jabatan: "Manajer Proyek", telepon: "0817-6600-7701", email: "maya@cahayateknik.co.id" },
      { nama: "Fajar Nugroho", jabatan: "Insinyur Lingkungan", telepon: "0817-6600-7702", email: "fajar@cahayateknik.co.id" },
    ] },
  { id: seedPerusahaanId(7), nama: "PT Nusantara Energi Prima", npwp: "0789012345670000",
    alamat: "Jl. TB Simatupang No. 1, Kebagusan, Pasar Minggu, Jakarta Selatan", kota: "Jakarta", kabupaten: "Kota Jakarta Selatan",
    email: "info@nusantaraenergi.co.id", isActive: true,
    pic: [
      { nama: "Surya Andika", jabatan: "Direktur Utama", telepon: "0818-7700-8801", email: "surya@nusantaraenergi.co.id" },
      { nama: "Laila Sari", jabatan: "HSE Manager", telepon: "0818-7700-8802", email: "laila@nusantaraenergi.co.id" },
    ] },
  { id: seedPerusahaanId(8), nama: "CV Agro Subur Mandiri", npwp: "0890123456780000",
    alamat: "Jl. Magelang KM 7, Mlati, Sleman", kota: "Yogyakarta", kabupaten: "Kabupaten Sleman",
    email: "admin@agrosubur.co.id", isActive: true,
    pic: [
      { nama: "Wahyu Prasetyo", jabatan: "Pemilik", telepon: "0819-8800-9901", email: "wahyu@agrosubur.co.id" },
      { nama: "Endang Suprihatin", jabatan: "Kepala Operasional", telepon: "0819-8800-9902", email: "endang@agrosubur.co.id" },
    ] },
  { id: seedPerusahaanId(9), nama: "PT Bintang Maritim Indonesia", npwp: "0901234567890000",
    alamat: "Jl. Penghibur No. 58, Ujung Pandang, Makassar", kota: "Makassar", kabupaten: "Kota Makassar",
    email: "info@bintangmaritim.co.id", isActive: true,
    pic: [
      { nama: "Muh. Ridwan", jabatan: "General Manager", telepon: "0820-9900-0001", email: "ridwan@bintangmaritim.co.id" },
      { nama: "Sri Wahyuni", jabatan: "Legal & Compliance", telepon: "0820-9900-0002", email: "sri@bintangmaritim.co.id" },
    ] },
  { id: seedPerusahaanId(10), nama: "CV Pembangunan Baru Jaya", npwp: "0012345678900000",
    alamat: "Jl. Jenderal Sudirman KM 3.5, Bukit Besar", kota: "Palembang", kabupaten: "Kota Palembang",
    email: "admin@pembangunanbarujaya.co.id", isActive: true,
    pic: [{ nama: "Suparman", jabatan: "Direktur", telepon: "0821-0011-1100", email: "suparman@pembangunanbarujaya.co.id" }] },
  { id: seedPerusahaanId(11), nama: "PT Rimba Lestari Kalimantan", npwp: "0112233445560000",
    alamat: "Jl. Ahmad Yani No. 99, Pontianak Kota", kota: "Pontianak", kabupaten: "Kota Pontianak",
    email: "info@rimbalestari.co.id", isActive: true,
    pic: [
      { nama: "Jhon Efendi", jabatan: "CEO", telepon: "0822-1122-2200", email: "jhon@rimbalestari.co.id" },
      { nama: "Theresia Nadia", jabatan: "Environment Officer", telepon: "0822-1122-2201", email: "theresia@rimbalestari.co.id" },
    ] },
  { id: seedPerusahaanId(12), nama: "CV Techno Solusi Utama", npwp: "0223344556670000",
    alamat: "Jl. Soekarno Hatta No. 41, Lowokwaru", kota: "Malang", kabupaten: "Kota Malang",
    email: "hello@technosolusi.co.id", isActive: false,
    pic: [{ nama: "Dian Kusuma", jabatan: "Direktur Operasional", telepon: "0823-2233-3300", email: "dian@technosolusi.co.id" }] },
  { id: seedPerusahaanId(13), nama: "PT Alam Hijau Balikpapan", npwp: "0334455667780000",
    alamat: "Jl. Letjen Suprapto No. 12, Balikpapan Kota", kota: "Balikpapan", kabupaten: "Kota Balikpapan",
    email: "info@alamhijau.co.id", isActive: true,
    pic: [
      { nama: "Antonius Budi", jabatan: "Direktur", telepon: "0824-3344-4400", email: "antonius@alamhijau.co.id" },
      { nama: "Siska Dewi", jabatan: "HSSE Officer", telepon: "0824-3344-4401", email: "siska@alamhijau.co.id" },
    ] },
  { id: seedPerusahaanId(14), nama: "CV Karya Cipta Maju", npwp: "0445566778890000",
    alamat: "Kawasan Industri MM2100 Blok KK-5, Cikarang Barat", kota: "Bekasi", kabupaten: "Kabupaten Bekasi",
    email: "admin@karyaciptamaju.co.id", isActive: true,
    pic: [{ nama: "Hendro Santoso", jabatan: "Manajer Produksi", telepon: "0825-4455-5500", email: "hendro@karyaciptamaju.co.id" }] },
  { id: seedPerusahaanId(15), nama: "PT Delta Pratama Nusantara", npwp: "0556677889900000",
    alamat: "Jl. Hang Kesturi KM 4, Nongsa", kota: "Batam", kabupaten: "Kota Batam",
    email: "contact@deltapratama.co.id", isActive: true,
    pic: [
      { nama: "Lim Beng Huat", jabatan: "CEO", telepon: "0826-5566-6600", email: "lim@deltapratama.co.id" },
      { nama: "Ratna Sari", jabatan: "Compliance Manager", telepon: "0826-5566-6601", email: "ratna@deltapratama.co.id" },
    ] },
  { id: seedPerusahaanId(16), nama: "CV Mitra Selaras Lingkungan", npwp: "0667788990010000",
    alamat: "Jl. MT Haryono No. 42, Samarinda Ulu", kota: "Samarinda", kabupaten: "Kota Samarinda",
    email: "info@mitraselaras.co.id", isActive: true,
    pic: [{ nama: "Harun Maulana", jabatan: "Pemilik", telepon: "0827-6677-7700", email: "harun@mitraselaras.co.id" }] },
  { id: seedPerusahaanId(17), nama: "PT Berkah Jaya Abadi", npwp: "0778899001120000",
    alamat: "Jl. Siliwangi No. 77, Kesambi", kota: "Cirebon", kabupaten: "Kota Cirebon",
    email: "berkah@berkahjayadai.co.id", isActive: true,
    pic: [
      { nama: "Yusuf Hidayat", jabatan: "Direktur Utama", telepon: "0828-7788-8800", email: "yusuf@berkahjayadai.co.id" },
      { nama: "Titi Sukmawati", jabatan: "Staf Administrasi", telepon: "0828-7788-8801", email: "titi@berkahjayadai.co.id" },
    ] },
  { id: seedPerusahaanId(18), nama: "CV Gemilang Persada", npwp: "0889900112230000",
    alamat: "Jl. A. Yani KM 33, Landasan Ulin", kota: "Banjarmasin", kabupaten: "Kota Banjarmasin",
    email: "admin@gemilangpersada.co.id", isActive: true,
    pic: [{ nama: "Rudi Setiawan", jabatan: "Pemilik", telepon: "0829-8899-9900", email: "rudi.s@gemilangpersada.co.id" }] },
  { id: seedPerusahaanId(19), nama: "PT Surya Pratama Mandiri", npwp: "0990011223340000",
    alamat: "Jl. Sudirman No. 128, Pekanbaru Kota", kota: "Pekanbaru", kabupaten: "Kota Pekanbaru",
    email: "surya@suryapratama.co.id", isActive: true,
    pic: [
      { nama: "Eko Wahyudi", jabatan: "Direktur", telepon: "0830-9900-0010", email: "eko@suryapratama.co.id" },
      { nama: "Nurhasanah", jabatan: "Manajer Lingkungan", telepon: "0830-9900-0011", email: "nur@suryapratama.co.id" },
    ] },
  { id: seedPerusahaanId(20), nama: "CV Indo Niaga Lestari", npwp: "0001122334450000",
    alamat: "Jl. Pajajaran No. 15, Bogor Tengah", kota: "Bogor", kabupaten: "Kota Bogor",
    email: "info@indonialestari.co.id", isActive: false,
    pic: [{ nama: "Agus Kurniawan", jabatan: "Direktur", telepon: "0831-0011-1110", email: "agus.k@indonialestari.co.id" }] },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set (see .env.example).");
  }

  const sql = postgres(databaseUrl);
  try {
    for (const c of companies) {
      await sql.begin(async (tx) => {
        // BYPASSRLS only takes effect for the *current* role — same reasoning
        // as scripts/seed-admin.ts.
        await tx`set local role service_role`;

        const [existing] = await tx`select id from companies where id = ${c.id}`;
        if (existing) {
          console.log(`Company ${c.nama} (${c.id}) already exists — skipping.`);
          return;
        }

        await tx`
          insert into companies (id, name, address, city, regency, npwp, email, is_active)
          values (${c.id}, ${c.nama}, ${c.alamat}, ${c.kota}, ${c.kabupaten}, ${c.npwp}, ${c.email}, ${c.isActive})
        `;
        for (const [i, pic] of c.pic.entries()) {
          await tx`
            insert into company_contacts (company_id, name, phone, email, position, is_primary)
            values (${c.id}, ${pic.nama}, ${pic.telepon}, ${pic.email || null}, ${pic.jabatan || null}, ${i === 0})
          `;
        }
        console.log(`Seeded company: ${c.nama} (${c.id})`);
      });
    }
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
