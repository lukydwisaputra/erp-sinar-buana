import { Screenshot } from "@/components/screenshot";
import { Callout } from "@/components/callout";

export default function KelengkapanPage() {
  return (
    <>
      <h1>Kelengkapan Administrasi</h1>
      <p className="lede">
        Perpustakaan template checklist persyaratan administratif (mis. surat kuasa,
        dokumen legal klien) yang dipakai saat menyusun bagian &quot;Kelengkapan&quot; pada
        dokumen SPH — bukan pelacak status per proyek/penawaran, dan tidak ada fitur
        unggah berkas di modul ini.
      </p>

      <h2>Daftar template</h2>
      <p>
        Setiap template memiliki nomor otomatis (<code>KLG/00001</code>), nama, dan
        jumlah persyaratan. Klik <strong>Tambah Template</strong> untuk membuat template
        baru, atau gunakan menu titik-tiga pada sebuah baris untuk <strong>Ubah</strong>{" "}
        atau <strong>Hapus</strong>.
      </p>
      <Screenshot src="/screenshots/kelengkapan-list.png" caption="Daftar Kelengkapan Administrasi." />

      <h2>Menyusun persyaratan</h2>
      <p>
        Pada form Tambah/Ubah, setiap persyaratan adalah satu baris teks bebas dalam
        daftar bernomor huruf (a, b, c, ...). Baris dapat ditambah, dihapus, atau diurut
        ulang lewat drag handle; baris yang dikosongkan otomatis terhapus saat form
        kehilangan fokus.
      </p>

      <h2>Detail template</h2>
      <p>
        Menampilkan pratinjau dokumen persyaratan yang siap diunduh/dicetak, dalam
        format yang sama seperti saat template ini disisipkan ke dalam SPH.
      </p>
      <Screenshot src="/screenshots/kelengkapan-detail.png" caption="Pratinjau dokumen template kelengkapan." />

      <Callout>
        Template di sini tidak terikat ke proyek/penawaran tertentu — template hanya
        menjadi acuan persyaratan yang dipilih saat menyusun bagian Kelengkapan pada
        pembuatan SPH (menu Penawaran). Pelacakan status &quot;sudah lengkap/belum&quot;
        untuk kebutuhan riil dilakukan secara manual di luar aplikasi ini.
      </Callout>
    </>
  );
}
