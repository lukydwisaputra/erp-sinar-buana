import { companyProfileCache } from "@/lib/company-profile/cache";

/** SBMJ letterhead. `full` = angled brand band (cover/invoice); `strip` = compact bar (appendix pages). */
export function DocumentLetterhead({
  variant = "full",
}: {
  variant?: "full" | "strip";
}): React.JSX.Element {
  // Read fresh on every render — `.current` is reassigned wholesale whenever
  // the real profile query resolves (src/components/shell/app-sidebar.tsx),
  // so a stale module-level alias would never pick up edits made via
  // /profil-perusahaan.
  const companyProfile = companyProfileCache.current;
  if (variant === "strip") {
    return (
      <div className="flex items-center gap-2 border-b border-(--doc-rule) px-8 py-1.5">
        <Logo className="size-7 text-[9px]" />
        <div>
          <p className="text-[11px] font-bold leading-tight text-(--doc-blue)">{companyProfile.nama}</p>
          <p className="text-[9px] tracking-wide text-(--doc-blue-2)">{companyProfile.tagline}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="relative flex h-20 items-stretch justify-between overflow-hidden">
      <div className="relative h-full w-3/5">
        <div className="absolute inset-0 bg-(--doc-blue)" style={{ clipPath: "polygon(0 0, 100% 0, 88% 55%, 0 55%)" }} />
        <div className="absolute inset-0 bg-(--doc-blue-2)" style={{ clipPath: "polygon(0 55%, 88% 55%, 78% 100%, 0 100%)" }} />
      </div>
      <div className="flex items-center justify-end gap-4 px-8">
        <p className="whitespace-nowrap text-lg font-bold leading-tight text-(--doc-blue)">
          {companyProfile.nama}
        </p>
        <Logo className="size-16 text-xs" />
      </div>
    </div>
  );
}

/** Configurable logo: real image when `companyProfile.logo` is set, else the SBMJ badge. */
function Logo({ className = "" }: { className?: string }): React.JSX.Element {
  const { logo } = companyProfileCache.current;
  if (logo) {
    return <img src={logo} alt="Logo" className={`object-contain ${className}`} />;
  }
  return (
    <div className={`flex items-center justify-center rounded-full border-2 border-(--doc-blue) text-(--doc-blue) ${className}`}>
      <span className="font-bold tracking-tight">SBMJ</span>
    </div>
  );
}
