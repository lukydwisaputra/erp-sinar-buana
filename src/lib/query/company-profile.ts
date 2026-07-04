"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getCompanyProfile, updateCompanyProfile } from "@/lib/data/company-profile";
import type { CompanyProfile } from "@/lib/schemas/company-profile";

export function useCompanyProfile() {
  return useQuery({ queryKey: ["company-profile"], queryFn: getCompanyProfile });
}

export function useUpdateCompanyProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CompanyProfile) => updateCompanyProfile(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["company-profile"] });
      toast.success("Profil perusahaan diperbarui.");
    },
    onError: () => {
      toast.error("Gagal memperbarui profil perusahaan. Coba lagi.");
    },
  });
}
