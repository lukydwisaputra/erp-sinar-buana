"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { Periode } from "@/lib/dasbor/types";
import type { ProfitabilitasView } from "@/lib/dasbor/profitability";
import type { ForecastView, AlertItem } from "@/lib/dasbor/types";

// profitabilitas/alerts/forekast now all go through real API routes —
// getProfitabilitas/getAlerts/getForekast transitively call real
// Proyek/Realisasi RAB/Faktur/Arus Kas/Pajak service functions (DB access),
// which can't run client-side (see src/app/api/dasbor/*/route.ts).
export function useProfitabilitas(periode: Periode) {
  return useQuery({
    queryKey: ["dasbor", "profitabilitas", periode.mulai, periode.selesai],
    queryFn: () => apiClient.get<ProfitabilitasView>(`/api/dasbor/profitabilitas?mulai=${periode.mulai}&selesai=${periode.selesai}`),
  });
}

export function useForekast(horizonDays?: number) {
  return useQuery({
    queryKey: ["dasbor", "forekast", horizonDays ?? 90],
    queryFn: () => apiClient.get<ForecastView>(`/api/dasbor/forecast${horizonDays ? `?horizonDays=${horizonDays}` : ""}`),
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["dasbor", "alerts"],
    queryFn: () => apiClient.get<AlertItem[]>("/api/dasbor/alerts"),
  });
}
