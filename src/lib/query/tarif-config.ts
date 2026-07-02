"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getTarifConfig, updateTarifConfig } from "@/lib/data/tarif-config";
import type { TarifConfig } from "@/lib/schemas/tarif-config";

export function useTarifConfig() {
  return useQuery({ queryKey: ["tarif-config"], queryFn: getTarifConfig });
}

export function useUpdateTarifConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TarifConfig) => updateTarifConfig(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tarif-config"] });
      toast.success("Konfigurasi tarif diperbarui.");
    },
    onError: () => {
      toast.error("Gagal memperbarui konfigurasi tarif. Coba lagi.");
    },
  });
}
