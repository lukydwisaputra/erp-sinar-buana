"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { RealisasiRab, RealisasiRabFormValues } from "@/lib/schemas/realisasi-rab";

export function useRealisasiRabByProyek(proyekId: string) {
  return useQuery({
    queryKey: ["realisasi-rab", proyekId],
    queryFn: () => apiClient.get<RealisasiRab[]>(`/api/realisasi-rab?proyekId=${proyekId}`),
    enabled: !!proyekId,
  });
}

export function useCreateRealisasiRab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RealisasiRabFormValues) => apiClient.post<RealisasiRab>("/api/realisasi-rab", input),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["realisasi-rab", row.proyekId] });
      toast.success("Realisasi RAB berhasil dicatat.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal mencatat realisasi RAB.")),
  });
}

export function useUpdateRealisasiRab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; proyekId: string; input: RealisasiRabFormValues }) =>
      apiClient.patch<RealisasiRab>(`/api/realisasi-rab/${id}`, input),
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["realisasi-rab", proyekId] });
      toast.success("Realisasi RAB berhasil diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal memperbarui realisasi RAB.")),
  });
}

export function useRemoveRealisasiRab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; proyekId: string }) => apiClient.delete(`/api/realisasi-rab/${id}`),
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["realisasi-rab", proyekId] });
      toast.success("Realisasi RAB berhasil dihapus.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menghapus realisasi RAB.")),
  });
}
