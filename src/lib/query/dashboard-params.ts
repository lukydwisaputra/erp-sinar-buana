"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getDashboardParams, updateDashboardParams } from "@/lib/data/dashboard-params";
import type { DashboardParams } from "@/lib/schemas/dashboard-params";

export function useDashboardParams() {
  return useQuery({ queryKey: ["dashboard-params"], queryFn: getDashboardParams });
}

export function useUpdateDashboardParams() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DashboardParams) => updateDashboardParams(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["dashboard-params"] });
      toast.success("Parameter dasbor diperbarui.");
    },
    onError: () => {
      toast.error("Gagal memperbarui parameter dasbor. Coba lagi.");
    },
  });
}
