"use client";
import { useQuery } from "@tanstack/react-query";
import { getProfitabilitas } from "@/lib/dasbor/profitability";
import { getForekast } from "@/lib/dasbor/forecast-view";
import { getAlerts } from "@/lib/dasbor/alert-view";
import type { Periode } from "@/lib/dasbor/types";

export function useProfitabilitas(periode: Periode) {
  return useQuery({
    queryKey: ["dasbor", "profitabilitas", periode.mulai, periode.selesai],
    queryFn: () => getProfitabilitas(periode),
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
    queryFn: () => getAlerts(),
  });
}
