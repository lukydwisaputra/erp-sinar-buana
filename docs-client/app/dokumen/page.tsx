import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function DokumenPage() {
  return (
    <>
      <h1>Pengiriman Dokumen</h1>
      <p className="lede">
        Riwayat pengiriman dokumen (SPH, faktur, slip gaji) ke klien/karyawan lewat Email
        atau WhatsApp — mencatat kapan, ke tujuan mana, lewat kanal apa, dan berhasil atau
        tidak sebuah dokumen dikirim.
      </p>
      <p>
        Empat kartu di atas tabel meringkas Total Terkirim, jumlah lewat WhatsApp, jumlah
        lewat Email, dan jumlah Gagal Terkirim. Baris yang gagal menampilkan ikon
        peringatan — arahkan kursor padanya untuk melihat pesan errornya. Tabel bisa
        dicari berdasarkan nomor dokumen atau nama tujuan.
      </p>
      <Screenshot src="/screenshots/pengiriman.png" caption="Riwayat Pengiriman Dokumen." />

      <Callout>
        Pengiriman dilakukan dari tombol <strong>Kirim</strong> pada halaman dokumen
        terkait (mis. di halaman SPH, Faktur, atau Slip Gaji) — halaman ini hanya
        menampilkan riwayatnya, bukan tempat mengirim. Akun SMTP dan template pesan yang
        dipakai untuk mengirim diatur di Konfigurasi → Pengiriman.
      </Callout>
    </>
  );
}
