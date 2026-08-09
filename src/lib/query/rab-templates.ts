"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type {
  RabTemplate, CreateRabTemplateInput, UpdateRabTemplateInput,
} from "@/lib/schemas/rab-templates";

export function useRabTemplateList() {
  return useQuery({
    queryKey: ["rab-templates"],
    queryFn: () => apiClient.get<RabTemplate[]>("/api/rab-templates"),
  });
}

export function useCreateRabTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateRabTemplateInput) =>
      apiClient.post<RabTemplate>("/api/rab-templates", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rab-templates"] });
      toast.success("Template RAB berhasil ditambahkan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menyimpan template. Coba lagi.")),
  });
}

export function useUpdateRabTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateRabTemplateInput }) =>
      apiClient.patch<RabTemplate>(`/api/rab-templates/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rab-templates"] });
      toast.success("Template RAB berhasil diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menyimpan template. Coba lagi.")),
  });
}

export function useDeleteRabTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/rab-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rab-templates"] });
      toast.success("Template RAB berhasil dihapus.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menghapus template. Coba lagi.")),
  });
}
