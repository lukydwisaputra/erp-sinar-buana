/**
 * One-time bootstrap: inserts the 6 Kelengkapan Administrasi checklist
 * templates that used to live in `src/lib/fixtures/kelengkapan.ts` (deleted
 * once the module moved to a real backend). Idempotent — checked by name
 * against `uq_kelengkapan_templates_name`, re-running skips templates that
 * already exist.
 *
 * No run-order dependency on other seed scripts — unlike Katalog/Karyawan,
 * nothing here looks up rows in another table by label.
 *
 * Standalone by design (no `@/` imports, only relative ones) — same
 * convention as scripts/seed-katalog.ts.
 * Run: node --env-file=.env.local scripts/seed-kelengkapan.ts
 */
import postgres from "postgres";

type Template = {
  nama: string;
  items: string[];
};

const templates: Template[] = [
  {
    nama: "Kelengkapan Administrasi UKL-UPL/DPLH",
    items: [
      "Surat Permohonan",
      "Akta Pendirian/Perubahan (Untuk Perusahaan)",
      "Identitas Diri (KTP, NPWP)",
      "Status Tanah (Sertifikat, Bukti Perjanjian Sewa/Jual Beli) — harus di depan/diketahui notaris",
      "Surat Pernyataan Nilai Investasi",
      "Persetujuan Teknis (Sesuai Kebutuhan): Air Limbah, Udara Emisi, Limbah B3, ANDALALIN (Permenhub No. 17/2021)",
      "Keterangan Tata Ruang/PKKPR dari DPMPTSP/DPUTR/BPN",
      "Surat Pernyataan Tidak Keberatan Warga (minimal diketahui kepala desa)",
      "Dokumen OSS RBA: NIB, Pernyataan Mandiri K3L, Pernyataan Mandiri Kesediaan Kewajiban, Pernyataan Mandiri Terkait Tata Ruang/PKKPR",
      "Dokumen Lain Sesuai Kebutuhan (SUTT PLN, KKOP, Sepadan Rel KAI, dll)",
    ],
  },
  {
    nama: "Kelengkapan Administrasi Pertek Air Limbah",
    items: [
      "Surat Permohonan",
      "Identitas Diri (KTP, NPWP)",
      "Surat Kesesuaian Tata Ruang/PKKPR dari DPMPTSP/DPUTR/BPN",
      "Desain IPAL (jika telah memiliki IPAL)",
      "Layout lokasi (peta site plan)",
      "Hasil Uji Lab (sesuai kondisi operasional kegiatan usaha: belum beroperasi — tidak perlu; beroperasi tanpa IPAL — uji air limbah outlet; beroperasi dengan IPAL — uji inlet, outlet, dan badan air penerima, minimal 3–6 bulan)",
    ],
  },
  {
    nama: "Kelengkapan Administrasi SLO",
    items: [
      "Laporan Penyelesaian Pembangunan IPAL (jika ada)",
      "Perizinan Berusaha NIB",
      "Persetujuan Lingkungan",
      "Persetujuan Teknis",
      "Hasil Pemantauan Air Limbah dari Lab. Teregistrasi Menteri (minimal 3 bulan)",
      "Dokumen QA/QC tentang Tata Cara Uji Air Limbah dari Lab yang digunakan",
      "Sertifikat Registrasi Lab. Lingkungan",
    ],
  },
  {
    nama: "Kelengkapan Administrasi Rintek Limbah B3",
    items: [
      "Surat Permohonan",
      "Identitas Diri (KTP, NPWP)",
      "Nomor Induk Berusaha dari OSS",
      "Surat Kesesuaian Tata Ruang/PKKPR dari DPMPTSP/DPUTR/BPN",
      "Surat Pernyataan Lokasi Bebas Banjir dan Rawan Bencana Alam dan/atau dapat direkayasa dengan teknologi untuk perlindungan dan pengelolaan LH",
      "Surat Pernyataan Pemenuhan Persyaratan Lingkungan Hidup",
      "Surat Pernyataan Kewajiban Pemenuhan Rincian Teknis Penyimpanan Limbah B3",
      "Surat Pernyataan Komitmen Penyediaan SDM Pengelolaan Limbah B3 yang Kompeten",
      "Surat Pernyataan Komitmen Kerjasama dengan Pihak Ke-3 Pengangkut dan Pengelola LB3",
      "Dokumentasi Foto TPS LB3 — jika sudah berjalan wajib memenuhi kriteria standar TPS LB3 sesuai PermenLHK No. 6 Tahun 2021",
    ],
  },
  {
    nama: "Kelengkapan Administrasi Pertek Emisi Udara",
    items: [
      "Surat Permohonan",
      "Identitas Diri (KTP, NPWP)",
      "Surat Kesesuaian Tata Ruang/PKKPR dari DPMPTSP/DPUTR/BPN",
      "Data teknis sumber emisi (cerobong, kapasitas, bahan bakar)",
      "Hasil Uji Emisi dari Lab. Teregistrasi Menteri (minimal 2 periode)",
      "Layout lokasi dan posisi cerobong",
    ],
  },
  {
    nama: "Kelengkapan Administrasi AMDAL",
    items: [
      "Surat Permohonan",
      "Akta Pendirian/Perubahan Perusahaan",
      "Identitas Diri (KTP, NPWP) Pemrakarsa dan Penanggung Jawab",
      "Kesesuaian Tata Ruang/PKKPR dari instansi berwenang",
      "Profil usaha/kegiatan (jenis, skala, lokasi)",
      "Peta lokasi kegiatan (skala memadai)",
      "Surat Kesepakatan Kerangka Acuan (KA-ANDAL)",
      "Dokumen OSS: NIB dan izin terkait",
    ],
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set (see .env.example).");
  }

  const sql = postgres(databaseUrl);
  try {
    for (const t of templates) {
      await sql.begin(async (tx) => {
        // BYPASSRLS only takes effect for the *current* role — same reasoning
        // as scripts/seed-admin.ts / seed-katalog.ts.
        await tx`set local role service_role`;

        const [existing] = await tx`select id from kelengkapan_templates where name = ${t.nama}`;
        if (existing) {
          console.log(`Template "${t.nama}" already exists — skipping.`);
          return;
        }

        const [template] = await tx`
          insert into kelengkapan_templates (name) values (${t.nama}) returning id
        `;
        for (const [i, persyaratan] of t.items.entries()) {
          await tx`
            insert into kelengkapan_template_items (template_id, persyaratan, sort_order)
            values (${template.id}, ${persyaratan}, ${i})
          `;
        }
        console.log(`Seeded template: ${t.nama} (${template.id}, ${t.items.length} items)`);
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
