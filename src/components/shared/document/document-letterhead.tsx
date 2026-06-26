import { companyProfile } from "@/lib/company-profile";

/** SBMJ letterhead. `full` = angled brand band (cover/invoice); `strip` = compact bar (appendix pages). */
export function DocumentLetterhead({
  variant = "full",
}: {
  variant?: "full" | "strip";
}): React.JSX.Element {
  if (variant === "strip") {
    return (
      <div className="flex items-center gap-2 border-b border-[var(--doc-rule)] px-8 py-1.5">
        <Logo className="size-7 text-[9px]" />
        <div>
          <p className="text-[11px] font-bold leading-tight text-[var(--doc-blue)]">{companyProfile.nama}</p>
          <p className="text-[9px] tracking-wide text-[var(--doc-blue-2)]">{companyProfile.tagline}</p>
        </div>
      </div>
    );
  }
  return (
    <div className="relative flex items-stretch justify-between overflow-hidden">
      <div className="relative h-14 w-3/5">
        <div className="absolute inset-0 bg-[var(--doc-blue)]" style={{ clipPath: "polygon(0 0, 100% 0, 78% 100%, 0 100%)" }} />
        <div className="absolute inset-0 bg-[var(--doc-blue-2)]" style={{ clipPath: "polygon(0 55%, 88% 55%, 70% 100%, 0 100%)" }} />
      </div>
      <div className="flex flex-col items-end justify-center px-8 py-2 text-right">
        <Logo className="size-9 text-[9px]" />
        <p className="whitespace-nowrap text-[11px] font-bold leading-tight text-[var(--doc-blue)]">
          {companyProfile.nama}
        </p>
        <p className="text-[9px] tracking-wide text-[var(--doc-blue-2)]">{companyProfile.tagline}</p>
      </div>
    </div>
  );
}

/** Configurable logo: real image when `companyProfile.logo` is set, else the SBMJ badge. */
function Logo({ className = "" }: { className?: string }): React.JSX.Element {
  if (companyProfile.logo) {
    return <img src={companyProfile.logo} alt="Logo" className={`object-contain ${className}`} />;
  }
  return (
    <div className={`flex items-center justify-center rounded-full border-2 border-[var(--doc-blue)] text-[var(--doc-blue)] ${className}`}>
      <span className="font-bold tracking-tight">SBMJ</span>
    </div>
  );
}
