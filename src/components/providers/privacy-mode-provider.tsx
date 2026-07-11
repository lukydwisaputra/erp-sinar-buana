"use client";
import * as React from "react";
import { usePrivacySettings } from "@/lib/query/privacy-settings";

type PrivacyModeContextValue = {
  /** Whether the privacy-mode feature itself is turned on (Konfigurasi → Privasi). */
  featureEnabled: boolean;
  /** Whether masked values are currently shown in the clear. */
  revealed: boolean;
  toggleRevealed: () => void;
};

const PrivacyModeContext = React.createContext<PrivacyModeContextValue | null>(null);

export function PrivacyModeProvider({ children }: { children: React.ReactNode }) {
  const { data } = usePrivacySettings();
  const featureEnabled = data?.enabled ?? true;
  const [revealed, setRevealed] = React.useState(false);

  const value = React.useMemo<PrivacyModeContextValue>(
    () => ({
      featureEnabled,
      revealed: !featureEnabled || revealed,
      toggleRevealed: () => setRevealed((r) => !r),
    }),
    [featureEnabled, revealed],
  );

  return <PrivacyModeContext.Provider value={value}>{children}</PrivacyModeContext.Provider>;
}

/** Reveal/hide state for sensitive figures — Dasbor only (TopBar's eye toggle
 * is likewise only shown there; see src/components/shell/top-bar.tsx). */
export function usePrivacyMode(): PrivacyModeContextValue {
  const ctx = React.useContext(PrivacyModeContext);
  if (!ctx) throw new Error("usePrivacyMode must be used within PrivacyModeProvider");
  return ctx;
}
