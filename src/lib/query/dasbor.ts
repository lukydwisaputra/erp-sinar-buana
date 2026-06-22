"use client";
import { useQuery } from "@tanstack/react-query";
import { getProfitabilitas } from "@/lib/dasbor/profitability";
import type { Periode } from "@/lib/dasbor/types";

export function useProfitabilitas(periode: Periode) {
  return useQuery({
    queryKey: ["dasbor", "profitabilitas", periode.mulai, periode.selesai],
    queryFn: () => getProfitabilitas(periode),
  });
}
