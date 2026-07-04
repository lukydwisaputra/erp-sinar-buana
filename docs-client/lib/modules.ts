export type DocModule = {
  slug: string;
  label: string;
  group: string;
};

export type DocGroup = {
  label: string;
  modules: DocModule[];
};

/** Mirrors src/lib/nav.ts's sidebar grouping in the main app, plus the auth flow. */
export const DOC_GROUPS: DocGroup[] = [
  {
    label: "Masuk & Akun",
    modules: [{ slug: "masuk", label: "Masuk & Undangan Akun", group: "Masuk & Akun" }],
  },
  {
    label: "Utama",
    modules: [{ slug: "dasbor", label: "Dasbor", group: "Utama" }],
  },
  {
    label: "Penjualan",
    modules: [
      { slug: "penawaran", label: "Penawaran (SPH)", group: "Penjualan" },
      { slug: "proyek", label: "Proyek", group: "Penjualan" },
    ],
  },
  {
    label: "Keuangan",
    modules: [
      { slug: "faktur", label: "Faktur", group: "Keuangan" },
      { slug: "penggajian", label: "Penggajian", group: "Keuangan" },
      { slug: "arus-kas", label: "Arus Kas", group: "Keuangan" },
      { slug: "pajak", label: "Pajak", group: "Keuangan" },
    ],
  },
  {
    label: "Master Data",
    modules: [
      { slug: "perusahaan", label: "Perusahaan", group: "Master Data" },
      { slug: "katalog", label: "Katalog Layanan", group: "Master Data" },
      { slug: "karyawan", label: "Karyawan", group: "Master Data" },
      { slug: "kelengkapan", label: "Kelengkapan Administrasi", group: "Master Data" },
    ],
  },
  {
    label: "Administrasi",
    modules: [
      { slug: "pengiriman", label: "Pengiriman Dokumen", group: "Administrasi" },
      { slug: "konfigurasi", label: "Konfigurasi", group: "Administrasi" },
      { slug: "pengguna", label: "Pengguna", group: "Administrasi" },
      { slug: "profil-perusahaan", label: "Profil Perusahaan", group: "Administrasi" },
    ],
  },
];

export const ALL_MODULES: DocModule[] = DOC_GROUPS.flatMap((g) => g.modules);
