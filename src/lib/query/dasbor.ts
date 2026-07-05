"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { getForekast } from "@/lib/dasbor/forecast-view";
import type { Periode } from "@/lib/dasbor/types";
import type { ProfitabilitasView } from "@/lib/dasbor/profitability";
import type { AlertItem } from "@/lib/dasbor/types";

// profitabilitas/alerts now go through a real API route — getProfitabilitas/
// getAlerts transitively call real Proyek/Realisasi RAB service functions
// (DB access), which can't run client-side anymore like the rest of this
// still-mock dashboard (see src/app/api/dasbor/*/route.ts).
export function useProfitabilitas(periode: Periode) {
  return useQuery({
    queryKey: ["dasbor", "profitabilitas", periode.mulai, periode.selesai],
    queryFn: () => apiClient.get<ProfitabilitasView>(`/api/dasbor/profitabilitas?mulai=${periode.mulai}&selesai=${periode.selesai}`),
  });
}

export function useForekast(horizonDays?: number) {
  return useQuery({
    queryKey: ["dasbor", "forekast", horizonDays ?? 90],
    queryFn: () => getForekast(horizonDays),
  });
}

export function useAlerts() {
  return useQuery({
    queryKey: ["dasbor", "alerts"],
    queryFn: () => apiClient.get<AlertItem[]>("/api/dasbor/alerts"),
  });
}
