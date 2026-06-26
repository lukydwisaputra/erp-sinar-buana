import type { KelengkapanTemplate } from "@/lib/schemas/kelengkapan";
import { encodeKelengkapan } from "@/lib/id-generator";

export const kelengkapanFixtures: KelengkapanTemplate[] = [
  {
    id: encodeKelengkapan(1),
    nama: "Kelengkapan Administrasi UKL-UPL/DPLH",
    items: [
      { persyaratan: "Surat Permohonan" },
      { persyaratan: "Akta Pendirian/Perubahan (Untuk Perusahaan)" },
      { persyaratan: "Identitas Diri (KTP, NPWP)" },
      { persyaratan: "Status Tanah (Sertifikat, Bukti Perjanjian Sewa/Jual Beli) — harus di depan/diketahui notaris" },
      { persyaratan: "Surat Pernyataan Nilai Investasi" },
      { persyaratan: "Persetujuan Teknis (Sesuai Kebutuhan): Air Limbah, Udara Emisi, Limbah B3, ANDALALIN (Permenhub No. 17/2021)" },
      { persyaratan: "Keterangan Tata Ruang/PKKPR dari DPMPTSP/DPUTR/BPN" },
      { persyaratan: "Surat Pernyataan Tidak Keberatan Warga (minimal diketahui kepala desa)" },
      { persyaratan: "Dokumen OSS RBA: NIB, Pernyataan Mandiri K3L, Pernyataan Mandiri Kesediaan Kewajiban, Pernyataan Mandiri Terkait Tata Ruang/PKKPR" },
      { persyaratan: "Dokumen Lain Sesuai Kebutuhan (SUTT PLN, KKOP, Sepadan Rel KAI, dll)" },
    ],
  },
  {
    id: encodeKelengkapan(2),
    nama: "Kelengkapan Administrasi Pertek Air Limbah",
    items: [
      { persyaratan: "Surat Permohonan" },
      { persyaratan: "Identitas Diri (KTP, NPWP)" },
      { persyaratan: "Surat Kesesuaian Tata Ruang/PKKPR dari DPMPTSP/DPUTR/BPN" },
      { persyaratan: "Desain IPAL (jika telah memiliki IPAL)" },
      { persyaratan: "Layout lokasi (peta site plan)" },
      { persyaratan: "Hasil Uji Lab (sesuai kondisi operasional kegiatan usaha: belum beroperasi — tidak perlu; beroperasi tanpa IPAL — uji air limbah outlet; beroperasi dengan IPAL — uji inlet, outlet, dan badan air penerima, minimal 3–6 bulan)" },
    ],
  },
  {
    id: encodeKelengkapan(3),
    nama: "Kelengkapan Administrasi SLO",
    items: [
      { persyaratan: "Laporan Penyelesaian Pembangunan IPAL (jika ada)" },
      { persyaratan: "Perizinan Berusaha NIB" },
      { persyaratan: "Persetujuan Lingkungan" },
      { persyaratan: "Persetujuan Teknis" },
      { persyaratan: "Hasil Pemantauan Air Limbah dari Lab. Teregistrasi Menteri (minimal 3 bulan)" },
      { persyaratan: "Dokumen QA/QC tentang Tata Cara Uji Air Limbah dari Lab yang digunakan" },
      { persyaratan: "Sertifikat Registrasi Lab. Lingkungan" },
    ],
  },
  {
    id: encodeKelengkapan(4),
    nama: "Kelengkapan Administrasi Rintek Limbah B3",
    items: [
      { persyaratan: "Surat Permohonan" },
      { persyaratan: "Identitas Diri (KTP, NPWP)" },
      { persyaratan: "Nomor Induk Berusaha dari OSS" },
      { persyaratan: "Surat Kesesuaian Tata Ruang/PKKPR dari DPMPTSP/DPUTR/BPN" },
      { persyaratan: "Surat Pernyataan Lokasi Bebas Banjir dan Rawan Bencana Alam dan/atau dapat direkayasa dengan teknologi untuk perlindungan dan pengelolaan LH" },
      { persyaratan: "Surat Pernyataan Pemenuhan Persyaratan Lingkungan Hidup" },
      { persyaratan: "Surat Pernyataan Kewajiban Pemenuhan Rincian Teknis Penyimpanan Limbah B3" },
      { persyaratan: "Surat Pernyataan Komitmen Penyediaan SDM Pengelolaan Limbah B3 yang Kompeten" },
      { persyaratan: "Surat Pernyataan Komitmen Kerjasama dengan Pihak Ke-3 Pengangkut dan Pengelola LB3" },
      { persyaratan: "Dokumentasi Foto TPS LB3 — jika sudah berjalan wajib memenuhi kriteria standar TPS LB3 sesuai PermenLHK No. 6 Tahun 2021" },
    ],
  },
  {
    id: encodeKelengkapan(5),
    nama: "Kelengkapan Administrasi Pertek Emisi Udara",
    items: [
      { persyaratan: "Surat Permohonan" },
      { persyaratan: "Identitas Diri (KTP, NPWP)" },
      { persyaratan: "Surat Kesesuaian Tata Ruang/PKKPR dari DPMPTSP/DPUTR/BPN" },
      { persyaratan: "Data teknis sumber emisi (cerobong, kapasitas, bahan bakar)" },
      { persyaratan: "Hasil Uji Emisi dari Lab. Teregistrasi Menteri (minimal 2 periode)" },
      { persyaratan: "Layout lokasi dan posisi cerobong" },
    ],
  },
  {
    id: encodeKelengkapan(6),
    nama: "Kelengkapan Administrasi AMDAL",
    items: [
      { persyaratan: "Surat Permohonan" },
      { persyaratan: "Akta Pendirian/Perubahan Perusahaan" },
      { persyaratan: "Identitas Diri (KTP, NPWP) Pemrakarsa dan Penanggung Jawab" },
      { persyaratan: "Kesesuaian Tata Ruang/PKKPR dari instansi berwenang" },
      { persyaratan: "Profil usaha/kegiatan (jenis, skala, lokasi)" },
      { persyaratan: "Peta lokasi kegiatan (skala memadai)" },
      { persyaratan: "Surat Kesepakatan Kerangka Acuan (KA-ANDAL)" },
      { persyaratan: "Dokumen OSS: NIB dan izin terkait" },
    ],
  },
];
