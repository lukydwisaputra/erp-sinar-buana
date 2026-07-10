"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import type { NumberingSettings, UpdateNumberingSettingsInput } from "@/lib/schemas/numbering";

function apiErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useNumberingSettings() {
  return useQuery({
    queryKey: ["numbering-settings"],
    queryFn: () => apiClient.get<NumberingSettings>("/api/numbering-settings"),
  });
}

export function useUpdateNumberingSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateNumberingSettingsInput) =>
      apiClient.patch<NumberingSettings>("/api/numbering-settings", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["numbering-settings"] });
      toast.success("Format penomoran diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal memperbarui format penomoran.")),
  });
}
