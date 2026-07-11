"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type {
  TerminTemplate, CreateTerminTemplateInput, UpdateTerminTemplateInput,
} from "@/lib/schemas/termin-templates";

export function useTerminTemplateList() {
  return useQuery({
    queryKey: ["termin-templates"],
    queryFn: () => apiClient.get<TerminTemplate[]>("/api/termin-templates"),
  });
}

export function useCreateTerminTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTerminTemplateInput) =>
      apiClient.post<TerminTemplate>("/api/termin-templates", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["termin-templates"] });
      toast.success("Template termin berhasil ditambahkan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menyimpan template. Coba lagi.")),
  });
}

export function useUpdateTerminTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTerminTemplateInput }) =>
      apiClient.patch<TerminTemplate>(`/api/termin-templates/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["termin-templates"] });
      toast.success("Template termin berhasil diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menyimpan template. Coba lagi.")),
  });
}

export function useDeleteTerminTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/termin-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["termin-templates"] });
      toast.success("Template termin berhasil dihapus.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menghapus template. Coba lagi.")),
  });
}
