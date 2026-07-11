"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiError, apiErrorMessage } from "@/lib/api-client";
import type { CompanyProfile, UpdateCompanyProfileInput } from "@/lib/schemas/company-profile";

export function useCompanyProfile() {
  return useQuery({
    queryKey: ["company-profile"],
    queryFn: () => apiClient.get<CompanyProfile>("/api/company-profile"),
  });
}

/** Raw fetch, not apiClient — a multipart body needs the browser to set its
 * own `Content-Type: multipart/form-data; boundary=...`, which apiClient's
 * hardcoded `application/json` header would break. */
export function useUploadLogo() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/company-profile/logo", { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new ApiError(body?.error ?? "Gagal mengunggah logo.", res.status);
      return body as { url: string };
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal mengunggah logo. Coba lagi.")),
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
