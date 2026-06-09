import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { companyProfile } from "@/lib/company-profile";

/** SBMJ contact footer band — repeated at the bottom of every page. */
export function SphFooter(): React.JSX.Element {
  return (
    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 bg-[var(--sph-blue-soft)] px-8 py-3 text-[11px] text-[var(--sph-blue)]">
      <span className="inline-flex items-center gap-1">
        <Phone className="size-3.5" /> {companyProfile.telepon}
      </span>
      <span className="inline-flex items-center gap-1">
        <Mail className="size-3.5" /> {companyProfile.email}
      </span>
      <span className="inline-flex items-center gap-1">
        <MapPin className="size-3.5" /> {companyProfile.alamat.join(" / ")}
      </span>
      <span className="inline-flex items-center gap-1">
        <Globe className="size-3.5" /> {companyProfile.website}
      </span>
    </div>
  );
}

/**
 * A single A4 page: fixed 210mm width, ≥297mm tall, white, with the SBMJ
 * footer pinned to the bottom. `children` render the page header + body.
 */
export function SphPage({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="sph-doc mx-auto flex min-h-[297mm] w-[210mm] flex-col bg-white text-[var(--sph-ink)] shadow-sm print:shadow-none">
      <div className="flex flex-1 flex-col">{children}</div>
      <SphFooter />
    </div>
  );
}
