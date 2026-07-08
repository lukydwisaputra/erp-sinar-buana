"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { PajakConfig } from "@/lib/schemas/pajak-config";

const KEY = ["pajak-config"];

export function usePajakConfig() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiClient.get<PajakConfig>("/api/dasbor/pajak-config"),
  });
}

export function useUpdatePajakConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PajakConfig) => apiClient.patch<PajakConfig>("/api/dasbor/pajak-config", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Konfigurasi pajak diperbarui.");
    },
    onError: () => {
      toast.error("Gagal memperbarui konfigurasi pajak. Coba lagi.");
    },
  });
}
