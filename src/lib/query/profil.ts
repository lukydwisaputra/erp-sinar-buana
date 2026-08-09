"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { UpdateProfilInput, ChangePasswordInput } from "@/lib/schemas/profil";
import type { Account } from "@/lib/auth/accounts";

export function useProfil() {
  return useQuery({
    queryKey: ["profil"],
    queryFn: () => apiClient.get<Account>("/api/profil"),
  });
}

export function useUpdateProfil() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateProfilInput) => apiClient.patch<Account>("/api/profil", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profil"] });
      qc.invalidateQueries({ queryKey: ["session"] });
      toast.success("Profil berhasil diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal memperbarui profil.")),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: ChangePasswordInput) => apiClient.post("/api/profil/password", input),
    onSuccess: () => toast.success("Sandi berhasil diubah."),
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal mengubah sandi.")),
  });
}
