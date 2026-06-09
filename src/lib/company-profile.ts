export const companyProfile = {
  nama: "PT SINAR BUANA MANDIRI JAYA",
  tagline: "KONSULTAN LINGKUNGAN",
  /** When empty, the document renders the "SBMJ" placeholder badge. Set to an
      image path/URL to render the real logo. */
  logo: "",
  kota: "Bandung",
  telepon: "0856-2483-2610",
  email: "contact.sbmj@gmail.com",
  website: "www.portalkonsultan.com",
  alamat: [
    "Perum Purwasari Permai C.89, Kab. Karawang",
    "Grand Cinunuk Residence C.10, Kab. Bandung",
  ],
  direktur: { nama: "Dini Mardiani, SE.,MBA", jabatan: "Direktur" },
  bank: {
    nama: "BNI",
    atasNama: "SINAR BUANA MANDIRI JAYA",
    noRekening: "0559332815",
  },
} as const;
