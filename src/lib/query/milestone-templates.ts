"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type {
  MilestoneTemplate, CreateMilestoneTemplateInput, UpdateMilestoneTemplateInput,
} from "@/lib/schemas/milestone-templates";

export function useMilestoneTemplateList() {
  return useQuery({
    queryKey: ["milestone-templates"],
    queryFn: () => apiClient.get<MilestoneTemplate[]>("/api/milestone-templates"),
  });
}

export function useCreateMilestoneTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMilestoneTemplateInput) =>
      apiClient.post<MilestoneTemplate>("/api/milestone-templates", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["milestone-templates"] });
      toast.success("Template milestone berhasil ditambahkan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menyimpan template. Coba lagi.")),
  });
}

export function useUpdateMilestoneTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateMilestoneTemplateInput }) =>
      apiClient.patch<MilestoneTemplate>(`/api/milestone-templates/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["milestone-templates"] });
      toast.success("Template milestone berhasil diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menyimpan template. Coba lagi.")),
  });
}

export function useDeleteMilestoneTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/milestone-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["milestone-templates"] });
      toast.success("Template milestone berhasil dihapus.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menghapus template. Coba lagi.")),
  });
}
