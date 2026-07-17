"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { SignatureTemplate, CreateSignatureTemplateInput, UpdateSignatureTemplateInput } from "@/lib/schemas/signature-templates";

export function useSignatureTemplateList() {
  return useQuery({
    queryKey: ["signature-templates"],
    queryFn: () => apiClient.get<SignatureTemplate[]>("/api/signature-templates"),
  });
}

export function useCreateSignatureTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSignatureTemplateInput) => apiClient.post<SignatureTemplate>("/api/signature-templates", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["signature-templates"] });
      toast.success("Template Tanda Tangan berhasil ditambahkan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menyimpan template. Coba lagi.")),
  });
}

export function useUpdateSignatureTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateSignatureTemplateInput }) =>
      apiClient.patch<SignatureTemplate>(`/api/signature-templates/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["signature-templates"] });
      toast.success("Template Tanda Tangan berhasil diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menyimpan template. Coba lagi.")),
  });
}

export function useDeleteSignatureTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/signature-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["signature-templates"] });
      toast.success("Template Tanda Tangan berhasil dihapus.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menghapus template. Coba lagi.")),
  });
}
