import type { CompanyProfile } from "@/lib/schemas/company-profile";

/** Reproduces the previous hardcoded `src/lib/company-profile.ts` literal
 * exactly — no behavior change on first load. Read directly (`.current`) by
 * the printed-document components (letterhead/footer/faktur/slip/SPH cover)
 * since those render synchronously with no loading state; the settings page
 * goes through the data/query layer below. */
export const companyProfileFixture: { current: CompanyProfile } = {
  current: {
    nama: "PT SINAR BUANA MANDIRI JAYA",
    tagline: "KONSULTAN LINGKUNGAN",
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
  },
};
