import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function PengirimanPage() {
  return (
    <>
      <h1>Pengiriman Dokumen</h1>
      <p className="lede">
        Riwayat pengiriman dokumen (SPH, faktur, dan lainnya) ke klien — mencatat kapan
        dan ke tujuan mana sebuah dokumen dikirim.
      </p>
      <Screenshot src="/screenshots/pengiriman.png" caption="Riwayat Pengiriman Dokumen." />

      <Callout>
        Pengiriman dilakukan dari tombol <strong>Kirim</strong> pada halaman dokumen
        terkait (mis. di halaman SPH atau Faktur) — halaman ini hanya menampilkan
        riwayatnya.
      </Callout>
    </>
  );
}
