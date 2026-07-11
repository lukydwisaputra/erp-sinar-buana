"use client";
import { usePrivacyMode } from "@/components/providers/privacy-mode-provider";

/**
 * Wraps a formatted money string; renders a dot placeholder instead when
 * privacy mode is active. No icon of its own — the single TopBar eye toggle
 * (usePrivacyMode) controls every instance at once.
 *
 * The real value always renders under `@media print` regardless of the
 * on-screen reveal state: printable documents (slip gaji, faktur) call
 * `window.print()` on this same DOM, so a masked screen must not produce a
 * masked printout/PDF.
 */
export function MaskedValue({ children }: { children: React.ReactNode }) {
  const { revealed } = usePrivacyMode();
  if (revealed) return <>{children}</>;
  return (
    <>
      <span className="hidden print:inline">{children}</span>
      <span aria-hidden="true" className="print:hidden">••••••</span>
    </>
  );
}
