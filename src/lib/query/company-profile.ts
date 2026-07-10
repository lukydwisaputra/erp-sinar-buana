"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import type { CompanyProfile, UpdateCompanyProfileInput } from "@/lib/schemas/company-profile";

function apiErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useCompanyProfile() {
  return useQuery({
    queryKey: ["company-profile"],
    queryFn: () => apiClient.get<CompanyProfile>("/api/company-profile"),
  });
}

export function useUpdateCompanyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateCompanyProfileInput) =>
      apiClient.patch<CompanyProfile>("/api/company-profile", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-profile"] });
      toast.success("Profil perusahaan diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal memperbarui profil perusahaan. Coba lagi.")),
  });
}
