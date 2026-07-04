import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { companyProfileFixture } from "@/lib/fixtures/company-profile";

/** SBMJ contact footer band — repeated at the bottom of every printed page. */
export function DocumentFooter(): React.JSX.Element {
  const companyProfile = companyProfileFixture.current;
  return (
    <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 bg-[var(--doc-blue-soft)] px-8 py-3 text-[11px] text-[var(--doc-blue)]">
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
