/**
 * One-time bootstrap: inserts the 20 demo quotations that the still
 * mock-fixture Proyek/Faktur modules cross-reference by id, so those lookups
 * keep resolving once Penawaran is served from real Postgres instead of
 * fixtures. Idempotent — re-running skips quotations that already exist.
 *
 * Also tops up `workflow_statuses` with a "Ditolak" row for entity='penawaran'
 * — the app's 5-value status enum (draft/terkirim/deal/ditolak/dibatalkan)
 * needs a status distinct from "Batal" to represent a rejected (vs. cancelled)
 * quotation; only 4 rows exist in db-schema's own seed.
 *
 * Simplification: this seed data covers quotation headers + line items +
 * term scheme (enough to keep Proyek/Faktur fixture cross-references
 * resolving and to populate the real Penawaran list), but does NOT reproduce
 * the mock's per-item RAB/Jadwal detail (`sampleItemRab()`/`sampleItemJadwal()`
 * generators in src/lib/sph-templates.ts, which those scripts can't import —
 * standalone by design, no `@/` aliases). RAB/Jadwal support itself is
 * verified directly (create a quotation with items via the real API and
 * confirm the per-item breakdown round-trips), not via this seed data.
 *
 * Run AFTER `npm run seed:perusahaan` and `npm run seed:katalog` (companyId/
 * serviceId are the fixed seed uuids those scripts already inserted).
 *
 * Standalone by design (no `@/` imports, only relative ones) — same
 * convention as scripts/seed-perusahaan.ts.
 * Run: node --env-file=.env.local scripts/seed-penawaran.ts
 */
import postgres from "postgres";
import { seedSphId } from "../src/lib/penawaran-seed-ids.ts";
import { seedPerusahaanId } from "../src/lib/perusahaan-seed-ids.ts";
import { seedLayananId } from "../src/lib/katalog-seed-ids.ts";

type Item = { layanan: number; nama: string; volume: number; harga: number; satuan: string };
type Termin = { label: string; persen: number; pemicu: string };
type Quotation = {
  seq: number;
  perusahaan: number;
  tanggal: string;
  status: "draft" | "terkirim" | "deal" | "ditolak" | "dibatalkan";
  rincianAktif: boolean;
  masaBerlakuAktif: boolean;
  masaBerlakuHari: number;
  lampiran: string;
  kalimatPembuka: string;
  items: Item[];
  termin: Termin[];
  catatan: string[];
  ppnAktif: boolean;
  ppnPersen: number;
  pph23Aktif: boolean;
  pph23Persen: number;
};

const STATUS_LABEL: Record<Quotation["status"], string> = {
  draft: "Draft",
  terkirim: "Leads - Terkirim",
  deal: "Convert - Deal",
  ditolak: "Ditolak",
  dibatalkan: "Batal",
};

// Mirrors src/lib/fixtures/penawaran.ts (header/items/termin only — see the
// RAB/Jadwal note above) — kept in sync by hand since that file imports via
// `@/` aliases this standalone script can't resolve.
const quotations: Quotation[] = [
  { seq: 1, perusahaan: 1, tanggal: "2026-05-04", status: "deal", rincianAktif: true, masaBerlakuAktif: true, masaBerlakuHari: 30, lampiran: "RAB dan Estimasi Waktu", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Penyusunan Pertek Air Limbah dan Laporan Pelaksanaan RKL-RPL Semester. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 1, nama: "Penyusunan Pertek Air Limbah", volume: 1, harga: 75_000_000, satuan: "Paket" }, { layanan: 4, nama: "Laporan Pelaksanaan RKL-RPL Semester", volume: 2, harga: 25_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 40, pemicu: "Mulai" }, { label: "Termin II", persen: 30, pemicu: "Pertek selesai" }, { label: "Termin III", persen: 30, pemicu: "Pelunasan" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%.", "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir."], ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 },
  { seq: 2, perusahaan: 3, tanggal: "2026-05-12", status: "deal", rincianAktif: true, masaBerlakuAktif: false, masaBerlakuHari: 30, lampiran: "RAB dan Estimasi Waktu", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen AMDAL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 2, nama: "Dokumen AMDAL", volume: 1, harga: 350_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 50, pemicu: "Mulai" }, { label: "Termin II", persen: 50, pemicu: "Pelunasan" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%.", "Termasuk pendampingan sidang AMDAL.", "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir."], ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 },
  { seq: 3, perusahaan: 5, tanggal: "2026-05-20", status: "draft", rincianAktif: true, masaBerlakuAktif: false, masaBerlakuHari: 30, lampiran: "RAB dan Estimasi Waktu", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen UKL-UPL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 3, nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 100, pemicu: "Pelunasan" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%.", "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir."], ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 },
  { seq: 4, perusahaan: 6, tanggal: "2026-06-02", status: "deal", rincianAktif: true, masaBerlakuAktif: false, masaBerlakuHari: 30, lampiran: "RAB dan Estimasi Waktu", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Persetujuan Teknis Emisi Udara. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 5, nama: "Persetujuan Teknis Emisi Udara", volume: 1, harga: 68_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 40, pemicu: "Mulai" }, { label: "Termin II", persen: 60, pemicu: "Pertek selesai" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%.", "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir."], ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 },
  { seq: 5, perusahaan: 2, tanggal: "2026-06-05", status: "terkirim", rincianAktif: true, masaBerlakuAktif: false, masaBerlakuHari: 30, lampiran: "RAB dan Estimasi Waktu", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen UKL-UPL dan Laporan Pelaksanaan RKL-RPL Semester. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 3, nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket" }, { layanan: 4, nama: "Laporan Pelaksanaan RKL-RPL Semester", volume: 1, harga: 25_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 50, pemicu: "Mulai" }, { label: "Termin II", persen: 50, pemicu: "Pelunasan" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%.", "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir."], ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 },
  { seq: 6, perusahaan: 7, tanggal: "2026-01-08", status: "deal", rincianAktif: true, masaBerlakuAktif: true, masaBerlakuHari: 30, lampiran: "RAB dan Estimasi Waktu", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan Dokumen UKL-UPL dan Laporan Pelaksanaan RKL-RPL Semester. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 3, nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket" }, { layanan: 4, nama: "Laporan Pelaksanaan RKL-RPL Semester", volume: 1, harga: 25_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 40, pemicu: "Mulai" }, { label: "Termin II", persen: 60, pemicu: "Pelunasan" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%.", "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir."], ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 },
  { seq: 7, perusahaan: 8, tanggal: "2026-02-14", status: "deal", rincianAktif: true, masaBerlakuAktif: false, masaBerlakuHari: 30, lampiran: "RAB dan Estimasi Waktu", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen AMDAL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 2, nama: "Dokumen AMDAL", volume: 1, harga: 350_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 100, pemicu: "Pelunasan" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%.", "Termasuk pendampingan sidang AMDAL.", "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir."], ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 },
  { seq: 8, perusahaan: 9, tanggal: "2026-03-05", status: "terkirim", rincianAktif: false, masaBerlakuAktif: true, masaBerlakuHari: 14, lampiran: "RAB dan Estimasi Waktu", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Penyusunan Pertek Air Limbah. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 1, nama: "Penyusunan Pertek Air Limbah", volume: 1, harga: 75_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 50, pemicu: "Mulai" }, { label: "Termin II", persen: 50, pemicu: "Pelunasan" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%.", "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir."], ppnAktif: true, ppnPersen: 12, pph23Aktif: false, pph23Persen: 2 },
  { seq: 9, perusahaan: 10, tanggal: "2026-03-18", status: "deal", rincianAktif: true, masaBerlakuAktif: false, masaBerlakuHari: 30, lampiran: "RAB dan Estimasi Waktu", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Persetujuan Teknis Emisi Udara. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 5, nama: "Persetujuan Teknis Emisi Udara", volume: 1, harga: 68_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 40, pemicu: "Mulai" }, { label: "Termin II", persen: 60, pemicu: "Pertek selesai" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%.", "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir."], ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 },
  { seq: 10, perusahaan: 11, tanggal: "2026-04-02", status: "draft", rincianAktif: false, masaBerlakuAktif: false, masaBerlakuHari: 30, lampiran: "", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen AMDAL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 2, nama: "Dokumen AMDAL", volume: 1, harga: 350_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 30, pemicu: "Mulai" }, { label: "Termin II", persen: 40, pemicu: "Sidang AMDAL" }, { label: "Termin III", persen: 30, pemicu: "Pelunasan" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%."], ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 },
  { seq: 11, perusahaan: 12, tanggal: "2026-04-10", status: "ditolak", rincianAktif: false, masaBerlakuAktif: true, masaBerlakuHari: 30, lampiran: "RAB dan Estimasi Waktu", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen UKL-UPL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 3, nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 100, pemicu: "Pelunasan" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%."], ppnAktif: false, ppnPersen: 12, pph23Aktif: false, pph23Persen: 2 },
  { seq: 12, perusahaan: 2, tanggal: "2026-04-22", status: "dibatalkan", rincianAktif: false, masaBerlakuAktif: false, masaBerlakuHari: 30, lampiran: "RAB dan Estimasi Waktu", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan Laporan Pelaksanaan RKL-RPL Semester. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 4, nama: "Laporan Pelaksanaan RKL-RPL Semester", volume: 2, harga: 25_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 100, pemicu: "Pelunasan" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%."], ppnAktif: true, ppnPersen: 12, pph23Aktif: false, pph23Persen: 2 },
  { seq: 13, perusahaan: 3, tanggal: "2026-05-07", status: "deal", rincianAktif: true, masaBerlakuAktif: false, masaBerlakuHari: 30, lampiran: "RAB dan Estimasi Waktu", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen UKL-UPL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 3, nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 100, pemicu: "Pelunasan" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%.", "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir."], ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 },
  { seq: 14, perusahaan: 6, tanggal: "2026-05-19", status: "terkirim", rincianAktif: true, masaBerlakuAktif: true, masaBerlakuHari: 30, lampiran: "RAB dan Estimasi Waktu", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan Pertek Air Limbah dan Persetujuan Teknis Emisi Udara. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 1, nama: "Penyusunan Pertek Air Limbah", volume: 1, harga: 75_000_000, satuan: "Paket" }, { layanan: 5, nama: "Persetujuan Teknis Emisi Udara", volume: 1, harga: 68_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 40, pemicu: "Mulai" }, { label: "Termin II", persen: 60, pemicu: "Pelunasan" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%.", "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir."], ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 },
  { seq: 15, perusahaan: 4, tanggal: "2026-06-10", status: "draft", rincianAktif: false, masaBerlakuAktif: false, masaBerlakuHari: 30, lampiran: "", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen AMDAL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 2, nama: "Dokumen AMDAL", volume: 1, harga: 350_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 50, pemicu: "Mulai" }, { label: "Termin II", persen: 50, pemicu: "Pelunasan" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%."], ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 },
  { seq: 16, perusahaan: 13, tanggal: "2026-06-12", status: "draft", rincianAktif: false, masaBerlakuAktif: false, masaBerlakuHari: 30, lampiran: "", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen AMDAL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 2, nama: "Dokumen AMDAL", volume: 1, harga: 350_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 30, pemicu: "Mulai" }, { label: "Termin II", persen: 40, pemicu: "Sidang AMDAL" }, { label: "Termin III", persen: 30, pemicu: "Pelunasan" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%."], ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 },
  { seq: 17, perusahaan: 14, tanggal: "2026-06-14", status: "terkirim", rincianAktif: false, masaBerlakuAktif: true, masaBerlakuHari: 14, lampiran: "RAB dan Estimasi Waktu", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan Pertek Air Limbah. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 1, nama: "Penyusunan Pertek Air Limbah", volume: 1, harga: 75_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 50, pemicu: "Mulai" }, { label: "Termin II", persen: 50, pemicu: "Pelunasan" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%.", "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir."], ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 },
  { seq: 18, perusahaan: 15, tanggal: "2026-06-16", status: "deal", rincianAktif: true, masaBerlakuAktif: false, masaBerlakuHari: 30, lampiran: "RAB dan Estimasi Waktu", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan Dokumen UKL-UPL dan Laporan Pelaksanaan RKL-RPL Semester. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 3, nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket" }, { layanan: 4, nama: "Laporan Pelaksanaan RKL-RPL Semester", volume: 1, harga: 25_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 50, pemicu: "Mulai" }, { label: "Termin II", persen: 50, pemicu: "Pelunasan" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%.", "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir."], ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 },
  { seq: 19, perusahaan: 7, tanggal: "2026-05-08", status: "deal", rincianAktif: true, masaBerlakuAktif: false, masaBerlakuHari: 30, lampiran: "RAB dan Estimasi Waktu", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan Persetujuan Teknis Emisi Udara. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 5, nama: "Persetujuan Teknis Emisi Udara", volume: 1, harga: 68_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 40, pemicu: "Mulai" }, { label: "Termin II", persen: 60, pemicu: "Pertek selesai" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%.", "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir."], ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 },
  { seq: 20, perusahaan: 11, tanggal: "2026-04-25", status: "deal", rincianAktif: true, masaBerlakuAktif: false, masaBerlakuHari: 30, lampiran: "RAB dan Estimasi Waktu", kalimatPembuka: "Sehubungan dengan adanya permintaan untuk Penyusunan dan Pengurusan Dokumen UKL-UPL. Dengan ini kami menawarkan jasa tersebut, dengan biaya sebagai berikut:", items: [{ layanan: 3, nama: "Dokumen UKL-UPL", volume: 1, harga: 45_000_000, satuan: "Paket" }], termin: [{ label: "Termin I", persen: 100, pemicu: "Pelunasan" }], catatan: ["Biaya diatas dengan catatan persyaratan administratif sudah lengkap.", "Biaya diatas belum termasuk PPN 11%.", "Rincian Anggaran Biaya dan Estimasi Waktu Pekerjaan Terlampir."], ppnAktif: true, ppnPersen: 12, pph23Aktif: true, pph23Persen: 2 },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set (see .env.example).");
  }

  const sql = postgres(databaseUrl);
  try {
    // Top up "Ditolak" for entity='penawaran' (db-schema/sql/seed/00_seed.sql
    // only seeds Draft/Leads-Terkirim/Convert-Deal/Batal).
    await sql.begin(async (tx) => {
      await tx`set local role service_role`;
      const [existing] = await tx`select id from workflow_statuses where entity = 'penawaran' and label = 'Ditolak'`;
      if (!existing) {
        const [{ max }] = await tx`select coalesce(max(sort_order), 0) as max from workflow_statuses where entity = 'penawaran'`;
        await tx`insert into workflow_statuses (entity, label, sort_order) values ('penawaran', 'Ditolak', ${Number(max) + 1})`;
        console.log(`workflow_statuses: seeded "Ditolak" (entity=penawaran).`);
      } else {
        console.log(`workflow_statuses: "Ditolak" (entity=penawaran) already exists — skipping.`);
      }
    });

    for (const q of quotations) {
      const id = seedSphId(q.seq);
      await sql.begin(async (tx) => {
        await tx`set local role service_role`;

        const [existingQ] = await tx`select id from quotations where id = ${id}`;
        if (existingQ) {
          console.log(`Quotation #${q.seq} (${id}) already exists — skipping.`);
          return;
        }

        const [status] = await tx`select id from workflow_statuses where entity = 'penawaran' and label = ${STATUS_LABEL[q.status]}`;
        if (!status) throw new Error(`Status "${STATUS_LABEL[q.status]}" not found — run seed:daftar-pilihan/this script's top-up first.`);

        const totalAmount = q.items.reduce((sum, it) => sum + it.volume * it.harga, 0);

        await tx`
          insert into quotations (
            id, date, company_id, status_id, validity_days, notes,
            total_amount, opening_sentence, attachment_note, rincian_active,
            ppn_active, ppn_percent, pph23_active, pph23_percent
          ) values (
            ${id}, ${q.tanggal}, ${seedPerusahaanId(q.perusahaan)}, ${status.id},
            ${q.masaBerlakuAktif ? q.masaBerlakuHari : null}, ${q.catatan.join("\n") || null},
            ${totalAmount}, ${q.kalimatPembuka || null}, ${q.lampiran || null}, ${q.rincianAktif},
            ${q.ppnAktif}, ${q.ppnPersen}, ${q.pph23Aktif}, ${q.pph23Persen}
          )
        `;

        for (const [i, item] of q.items.entries()) {
          await tx`
            insert into quotation_items (quotation_id, service_id, description, unit_price, quantity, unit, line_total, sort_order)
            values (${id}, ${seedLayananId(item.layanan)}, ${item.nama}, ${item.harga}, ${item.volume}, ${item.satuan}, ${item.volume * item.harga}, ${i})
          `;
        }
        for (const [i, t] of q.termin.entries()) {
          await tx`
            insert into quotation_term_scheme (quotation_id, label, percentage, milestone_trigger_label, sort_order)
            values (${id}, ${t.label}, ${t.persen}, ${t.pemicu || null}, ${i})
          `;
        }
        console.log(`Seeded quotation #${q.seq} (${id})`);
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
