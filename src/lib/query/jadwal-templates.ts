"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type {
  JadwalTemplate, CreateJadwalTemplateInput, UpdateJadwalTemplateInput,
} from "@/lib/schemas/jadwal-templates";

export function useJadwalTemplateList() {
  return useQuery({
    queryKey: ["jadwal-templates"],
    queryFn: () => apiClient.get<JadwalTemplate[]>("/api/jadwal-templates"),
  });
}

export function useCreateJadwalTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateJadwalTemplateInput) =>
      apiClient.post<JadwalTemplate>("/api/jadwal-templates", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jadwal-templates"] });
      toast.success("Template Jadwal berhasil ditambahkan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menyimpan template. Coba lagi.")),
  });
}

export function useUpdateJadwalTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateJadwalTemplateInput }) =>
      apiClient.patch<JadwalTemplate>(`/api/jadwal-templates/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jadwal-templates"] });
      toast.success("Template Jadwal berhasil diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menyimpan template. Coba lagi.")),
  });
}

export function useDeleteJadwalTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/jadwal-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["jadwal-templates"] });
      toast.success("Template Jadwal berhasil dihapus.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menghapus template. Coba lagi.")),
  });
}
