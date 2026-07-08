"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Periode } from "@/lib/dasbor/types";
import type { ProfitabilitasView } from "@/lib/dasbor/profitability";
import type { ForecastView, AlertItem } from "@/lib/dasbor/types";
import type { ProyekSummary } from "@/lib/dasbor/proyek-summary";

// profitabilitas/alerts/forekast now all go through real API routes —
// getProfitabilitas/getAlerts/getForekast transitively call real
// Proyek/Realisasi RAB/Faktur/Arus Kas/Pajak service functions (DB access),
// which can't run client-side (see src/app/api/dasbor/*/route.ts).
/**
 * `enabled` defaults to true (Admin/Keuangan) — pass `false` for non-finance
 * sessions so the request isn't even issued (belt-and-suspenders with the
 * route's own `requireFinance` 403; see src/app/api/dasbor/profitabilitas).
 */
export function useProfitabilitas(periode: Periode, enabled = true) {
  return useQuery({
    queryKey: ["dasbor", "profitabilitas", periode.mulai, periode.selesai],
    queryFn: () => apiClient.get<ProfitabilitasView>(`/api/dasbor/profitabilitas?mulai=${periode.mulai}&selesai=${periode.selesai}`),
    enabled,
    retry: false,
  });
}

export function useForekast(horizonDays?: number, enabled = true) {
  return useQuery({
    queryKey: ["dasbor", "forekast", horizonDays ?? 90],
    queryFn: () => apiClient.get<ForecastView>(`/api/dasbor/forecast${horizonDays ? `?horizonDays=${horizonDays}` : ""}`),
    enabled,
    retry: false,
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["dasbor", "alerts"],
    queryFn: () => apiClient.get<AlertItem[]>("/api/dasbor/alerts"),
  });
}

/** FR-09.4 — Ringkasan Proyek, all roles (Tim Teknis narrowed server-side). */
export function useProyekSummary() {
  return useQuery({
    queryKey: ["dasbor", "proyek-summary"],
    queryFn: () => apiClient.get<ProyekSummary>("/api/dasbor/proyek-summary"),
  });
}
