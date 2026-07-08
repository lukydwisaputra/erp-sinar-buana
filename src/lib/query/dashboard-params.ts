"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { DashboardParams } from "@/lib/schemas/dashboard-params";

const KEY = ["dashboard-params"];

export function useDashboardParams() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiClient.get<DashboardParams>("/api/dasbor/settings"),
  });
}

export function useUpdateDashboardParams() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DashboardParams) => apiClient.patch<DashboardParams>("/api/dasbor/settings", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Parameter dasbor diperbarui.");
    },
    onError: () => {
      toast.error("Gagal memperbarui parameter dasbor. Coba lagi.");
    },
  });
}
