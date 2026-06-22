"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getPajakConfig, updatePajakConfig } from "@/lib/data/pajak-config";
import type { PajakConfig } from "@/lib/schemas/pajak-config";

export function usePajakConfig() {
  return useQuery({ queryKey: ["pajak-config"], queryFn: getPajakConfig });
}

export function useUpdatePajakConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PajakConfig) => updatePajakConfig(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pajak-config"] });
      toast.success("Konfigurasi pajak diperbarui.");
    },
    onError: () => {
      toast.error("Gagal memperbarui konfigurasi pajak. Coba lagi.");
    },
  });
}
