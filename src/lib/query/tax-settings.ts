"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { TaxSettings, UpdateTaxSettingsInput } from "@/lib/schemas/tax-settings";

export function useTaxSettings() {
  return useQuery({
    queryKey: ["tax-settings"],
    queryFn: () => apiClient.get<TaxSettings>("/api/tax-settings"),
  });
}

export function useUpdateTaxSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTaxSettingsInput) => apiClient.patch<TaxSettings>("/api/tax-settings", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tax-settings"] });
      toast.success("Konfigurasi tarif diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal memperbarui konfigurasi tarif. Coba lagi.")),
  });
}
