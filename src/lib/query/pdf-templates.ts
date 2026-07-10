"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import type { PdfTemplate, CreatePdfTemplateInput, UpdatePdfTemplateInput } from "@/lib/schemas/pdf-templates";

function apiErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function usePdfTemplateList() {
  return useQuery({
    queryKey: ["pdf-templates"],
    queryFn: () => apiClient.get<PdfTemplate[]>("/api/pdf-templates"),
  });
}

export function useCreatePdfTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePdfTemplateInput) => apiClient.post<PdfTemplate>("/api/pdf-templates", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pdf-templates"] });
      toast.success("Template PDF berhasil ditambahkan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menyimpan template. Coba lagi.")),
  });
}

export function useUpdatePdfTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePdfTemplateInput }) =>
      apiClient.patch<PdfTemplate>(`/api/pdf-templates/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pdf-templates"] });
      toast.success("Template PDF berhasil diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menyimpan template. Coba lagi.")),
  });
}

export function useDeletePdfTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/pdf-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pdf-templates"] });
      toast.success("Template PDF berhasil dihapus.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menghapus template. Coba lagi.")),
  });
}
