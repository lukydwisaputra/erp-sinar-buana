/**
 * One-time bootstrap: inserts the 20 demo employees (+ one "Tunjangan
 * Transport" salary component each, so the computed `tunjangan` figure isn't
 * always zero) that the still mock-fixture modules (Proyek assignees,
 * Penggajian, Pengiriman) cross-reference by id, so those lookups keep
 * resolving once Karyawan is served from real Postgres instead of fixtures.
 * Idempotent — re-running skips employees that already exist.
 *
 * Run AFTER `npm run seed:daftar-pilihan` (positions/employment_statuses must
 * already have the rows this script looks up by label).
 *
 * Standalone by design (no `@/` imports, only relative ones) — same
 * convention as scripts/seed-perusahaan.ts.
 * Run: node --env-file=.env.local scripts/seed-karyawan.ts
 */
import postgres from "postgres";
import { seedKaryawanId } from "../src/lib/karyawan-seed-ids.ts";

type Employee = {
  id: string;
  nama: string;
  jabatan: string;
  statusKepegawaian: "Tetap" | "Kontrak" | "Probation";
  gajiPokok: number;
  tunjangan: number;
  bank: { nama: string; nomor: string; atasNama: string };
  npwp: string;
  email: string;
  telepon: string;
  tanggalMasuk: string;
  isActive: boolean;
};

// Mirrors src/lib/fixtures/karyawan.ts — kept in sync by hand since that file
// imports via `@/` aliases this standalone script can't resolve.
const employees: Employee[] = [
  { id: seedKaryawanId(1), nama: "Budi Santoso", jabatan: "Direktur", statusKepegawaian: "Tetap", gajiPokok: 25_000_000, tunjangan: 5_000_000, bank: { nama: "BCA", nomor: "1234567890", atasNama: "Budi Santoso" }, npwp: "0911122234440001", email: "budi@sinarbuana.co.id", telepon: "0812-1111-2201", tanggalMasuk: "2019-01-15", isActive: true },
  { id: seedKaryawanId(2), nama: "Rina Marlina", jabatan: "Manajer Keuangan", statusKepegawaian: "Tetap", gajiPokok: 14_000_000, tunjangan: 2_500_000, bank: { nama: "Mandiri", nomor: "1390011223344", atasNama: "Rina Marlina" }, npwp: "0922233345550002", email: "rina@sinarbuana.co.id", telepon: "0813-2222-3302", tanggalMasuk: "2020-06-01", isActive: true },
  { id: seedKaryawanId(3), nama: "Agus Setiawan", jabatan: "Ketua Tim Teknis", statusKepegawaian: "Tetap", gajiPokok: 12_000_000, tunjangan: 2_000_000, bank: { nama: "BNI", nomor: "0559332815", atasNama: "Agus Setiawan" }, npwp: "0933344445660003", email: "agus@sinarbuana.co.id", telepon: "0814-3333-4403", tanggalMasuk: "2021-02-10", isActive: true },
  { id: seedKaryawanId(4), nama: "Dewi Anggraini", jabatan: "Anggota Tim Teknis", statusKepegawaian: "Kontrak", gajiPokok: 8_500_000, tunjangan: 1_200_000, bank: { nama: "BRI", nomor: "302201998877", atasNama: "Dewi Anggraini" }, npwp: "0944455556770004", email: "dewi@sinarbuana.co.id", telepon: "0815-4444-5504", tanggalMasuk: "2023-08-01", isActive: true },
  { id: seedKaryawanId(5), nama: "Fajar Ramadhan", jabatan: "Pengendali Dokumen", statusKepegawaian: "Probation", gajiPokok: 6_500_000, tunjangan: 800_000, bank: { nama: "BCA", nomor: "5566778899", atasNama: "Fajar Ramadhan" }, npwp: "0955566667880005", email: "fajar@sinarbuana.co.id", telepon: "0816-5555-6605", tanggalMasuk: "2026-03-01", isActive: true },
  { id: seedKaryawanId(6), nama: "Sari Wulandari", jabatan: "Staf Marketing", statusKepegawaian: "Kontrak", gajiPokok: 7_000_000, tunjangan: 1_000_000, bank: { nama: "Mandiri", nomor: "1390099887766", atasNama: "Sari Wulandari" }, npwp: "0966677778990006", email: "sari@sinarbuana.co.id", telepon: "0817-6666-7706", tanggalMasuk: "2022-11-20", isActive: false },
  { id: seedKaryawanId(7), nama: "Hendra Permana", jabatan: "Ahli AMDAL Senior", statusKepegawaian: "Tetap", gajiPokok: 18_000_000, tunjangan: 3_500_000, bank: { nama: "BCA", nomor: "6677889900", atasNama: "Hendra Permana" }, npwp: "0977788889000007", email: "hendra.p@sinarbuana.co.id", telepon: "0818-7777-8807", tanggalMasuk: "2020-04-15", isActive: true },
  { id: seedKaryawanId(8), nama: "Nadia Kusumawati", jabatan: "Staf Lingkungan", statusKepegawaian: "Kontrak", gajiPokok: 7_500_000, tunjangan: 1_000_000, bank: { nama: "BNI", nomor: "9988776655", atasNama: "Nadia Kusumawati" }, npwp: "0988899990110008", email: "nadia@sinarbuana.co.id", telepon: "0819-8888-9908", tanggalMasuk: "2024-01-08", isActive: true },
  { id: seedKaryawanId(9), nama: "Rizky Firmansyah", jabatan: "Insinyur Teknik", statusKepegawaian: "Tetap", gajiPokok: 13_000_000, tunjangan: 2_200_000, bank: { nama: "Mandiri", nomor: "1390055443322", atasNama: "Rizky Firmansyah" }, npwp: "0999900001220009", email: "rizky@sinarbuana.co.id", telepon: "0820-9999-0009", tanggalMasuk: "2021-09-01", isActive: true },
  { id: seedKaryawanId(10), nama: "Yuli Astuti", jabatan: "Staf Administrasi", statusKepegawaian: "Probation", gajiPokok: 5_500_000, tunjangan: 600_000, bank: { nama: "BCA", nomor: "1122334455", atasNama: "Yuli Astuti" }, npwp: "0900011112330010", email: "yuli@sinarbuana.co.id", telepon: "0821-0000-1100", tanggalMasuk: "2026-04-15", isActive: true },
  { id: seedKaryawanId(11), nama: "Tono Sugiarto", jabatan: "Ahli K3", statusKepegawaian: "Tetap", gajiPokok: 11_000_000, tunjangan: 1_800_000, bank: { nama: "BRI", nomor: "5544332211", atasNama: "Tono Sugiarto" }, npwp: "0911011112230011", email: "tono@sinarbuana.co.id", telepon: "0822-1100-1101", tanggalMasuk: "2019-07-01", isActive: true },
  { id: seedKaryawanId(12), nama: "Dian Pratiwi", jabatan: "Staf GIS", statusKepegawaian: "Kontrak", gajiPokok: 8_000_000, tunjangan: 1_200_000, bank: { nama: "BCA", nomor: "2233445566", atasNama: "Dian Pratiwi" }, npwp: "0922122223340012", email: "dian.p@sinarbuana.co.id", telepon: "0823-2200-2202", tanggalMasuk: "2023-03-15", isActive: true },
  { id: seedKaryawanId(13), nama: "Bambang Mulyadi", jabatan: "Senior Konsultan", statusKepegawaian: "Tetap", gajiPokok: 20_000_000, tunjangan: 4_000_000, bank: { nama: "Mandiri", nomor: "1390077665544", atasNama: "Bambang Mulyadi" }, npwp: "0933233334450013", email: "bambang@sinarbuana.co.id", telepon: "0824-3300-3303", tanggalMasuk: "2018-05-10", isActive: true },
  { id: seedKaryawanId(14), nama: "Fitriani", jabatan: "Staf Penelitian", statusKepegawaian: "Kontrak", gajiPokok: 7_200_000, tunjangan: 900_000, bank: { nama: "BNI", nomor: "3344556677", atasNama: "Fitriani" }, npwp: "0944344445560014", email: "fitri@sinarbuana.co.id", telepon: "0825-4400-4404", tanggalMasuk: "2024-06-01", isActive: true },
  { id: seedKaryawanId(15), nama: "Gunawan Santoso", jabatan: "Analis Lingkungan", statusKepegawaian: "Tetap", gajiPokok: 14_500_000, tunjangan: 2_800_000, bank: { nama: "BCA", nomor: "4455667788", atasNama: "Gunawan Santoso" }, npwp: "0955455556670015", email: "gunawan@sinarbuana.co.id", telepon: "0826-5500-5505", tanggalMasuk: "2020-11-20", isActive: true },
  { id: seedKaryawanId(16), nama: "Heni Marlina", jabatan: "Admin Keuangan", statusKepegawaian: "Kontrak", gajiPokok: 7_000_000, tunjangan: 1_000_000, bank: { nama: "BRI", nomor: "6677889900", atasNama: "Heni Marlina" }, npwp: "0966566667780016", email: "heni@sinarbuana.co.id", telepon: "0827-6600-6606", tanggalMasuk: "2022-08-01", isActive: true },
  { id: seedKaryawanId(17), nama: "Irfan Maulana", jabatan: "Drafter", statusKepegawaian: "Probation", gajiPokok: 5_800_000, tunjangan: 700_000, bank: { nama: "BCA", nomor: "7788990011", atasNama: "Irfan Maulana" }, npwp: "0977677778890017", email: "irfan@sinarbuana.co.id", telepon: "0828-7700-7707", tanggalMasuk: "2026-02-01", isActive: true },
  { id: seedKaryawanId(18), nama: "Joko Susilo", jabatan: "Petugas Lapangan", statusKepegawaian: "Kontrak", gajiPokok: 6_500_000, tunjangan: 800_000, bank: { nama: "BNI", nomor: "8899001122", atasNama: "Joko Susilo" }, npwp: "0988788890000018", email: "joko@sinarbuana.co.id", telepon: "0829-8800-8808", tanggalMasuk: "2021-04-05", isActive: true },
  { id: seedKaryawanId(19), nama: "Kurnia Rahayu", jabatan: "Staf Legal", statusKepegawaian: "Tetap", gajiPokok: 10_500_000, tunjangan: 1_600_000, bank: { nama: "Mandiri", nomor: "1390033221100", atasNama: "Kurnia Rahayu" }, npwp: "0999899901110019", email: "kurnia@sinarbuana.co.id", telepon: "0830-9900-9909", tanggalMasuk: "2021-12-01", isActive: true },
  { id: seedKaryawanId(20), nama: "Lutfi Hakim", jabatan: "Konsultan Junior", statusKepegawaian: "Probation", gajiPokok: 6_000_000, tunjangan: 750_000, bank: { nama: "BCA", nomor: "9900112233", atasNama: "Lutfi Hakim" }, npwp: "0900900012220020", email: "lutfi@sinarbuana.co.id", telepon: "0831-0000-0010", tanggalMasuk: "2026-05-01", isActive: true },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set (see .env.example).");
  }

  const sql = postgres(databaseUrl);
  try {
    const [tunjanganTransport] = await sql`select id from salary_components where label = 'Tunjangan Transport'`;
    if (!tunjanganTransport) {
      throw new Error(
        "salary_components 'Tunjangan Transport' not found — run `npm run seed:daftar-pilihan` first (or db-schema/sql/seed/00_seed.sql).",
      );
    }

    for (const e of employees) {
      await sql.begin(async (tx) => {
        // BYPASSRLS only takes effect for the *current* role — same reasoning
        // as scripts/seed-admin.ts / seed-perusahaan.ts.
        await tx`set local role service_role`;

        const [existing] = await tx`select id from employees where id = ${e.id}`;
        if (existing) {
          console.log(`Employee ${e.nama} (${e.id}) already exists — skipping.`);
          return;
        }

        const [position] = await tx`select id from positions where label = ${e.jabatan}`;
        if (!position) throw new Error(`Position "${e.jabatan}" not found — run seed:daftar-pilihan first.`);
        const [status] = await tx`select id from employment_statuses where label = ${e.statusKepegawaian}`;
        if (!status) throw new Error(`Employment status "${e.statusKepegawaian}" not found.`);

        await tx`
          insert into employees (
            id, name, position_id, employment_status_id, base_salary,
            bank_name, bank_account_number, bank_account_holder, npwp, email, phone,
            join_date, is_active
          ) values (
            ${e.id}, ${e.nama}, ${position.id}, ${status.id}, ${e.gajiPokok},
            ${e.bank.nama}, ${e.bank.nomor}, ${e.bank.atasNama}, ${e.npwp}, ${e.email}, ${e.telepon},
            ${e.tanggalMasuk}, ${e.isActive}
          )
        `;
        await tx`
          insert into employee_salary_components (employee_id, salary_component_id, override_value)
          values (${e.id}, ${tunjanganTransport.id}, ${e.tunjangan})
        `;
        console.log(`Seeded employee: ${e.nama} (${e.id})`);
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
