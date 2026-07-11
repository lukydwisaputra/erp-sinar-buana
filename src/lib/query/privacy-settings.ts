"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { PrivacySettings } from "@/lib/schemas/privacy";

export function usePrivacySettings() {
  return useQuery({
    queryKey: ["privacy-settings"],
    queryFn: () => apiClient.get<PrivacySettings>("/api/privacy-settings"),
  });
}

export function useUpdatePrivacySettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: PrivacySettings) =>
      apiClient.patch<PrivacySettings>("/api/privacy-settings", patch),
    onSuccess: (data) => {
      qc.setQueryData(["privacy-settings"], data);
      toast.success("Pengaturan privasi disimpan.");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Gagal menyimpan pengaturan privasi.")),
  });
}
