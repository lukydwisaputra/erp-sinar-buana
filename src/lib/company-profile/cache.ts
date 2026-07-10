import type { CompanyProfile } from "@/lib/schemas/company-profile";

/** Printed-document components (letterhead/footer/faktur/slip/SPH cover)
 * render synchronously with no loading state, nested many levels deep with
 * zero props — prop-drilling live query data through all of them isn't
 * practical. Instead this singleton is kept in sync with the real
 * `useCompanyProfile()` query result from a single point in the persistent
 * app shell (`src/components/shell/app-sidebar.tsx`, mounted on every
 * authenticated page before any document can be opened). The literal below
 * is only a pre-fetch fallback, shown for the brief window before that first
 * query resolves. */
export const companyProfileCache: { current: CompanyProfile } = {
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
    npwp: "",
    isPkp: true,
    defaultSignerEmployeeId: null,
    direktur: { nama: "Dini Mardiani, SE.,MBA", jabatan: "Direktur" },
    bank: {
      nama: "BNI",
      atasNama: "SINAR BUANA MANDIRI JAYA",
      noRekening: "0559332815",
    },
  },
};
