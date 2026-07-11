"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { KelengkapanTemplate, CreateKelengkapanInput, UpdateKelengkapanInput } from "@/lib/schemas/kelengkapan";

export function useKelengkapanList() {
  return useQuery({
    queryKey: ["kelengkapan"],
    queryFn: () => apiClient.get<KelengkapanTemplate[]>("/api/kelengkapan"),
  });
}

export function useKelengkapan(id: string) {
  return useQuery({
    queryKey: ["kelengkapan", id],
    queryFn: () => apiClient.get<KelengkapanTemplate>(`/api/kelengkapan/${id}`),
    enabled: !!id,
  });
}

export function useCreateKelengkapan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateKelengkapanInput) => apiClient.post<KelengkapanTemplate>("/api/kelengkapan", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kelengkapan"] });
      toast.success("Template berhasil ditambahkan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menyimpan template. Coba lagi.")),
  });
}

export function useUpdateKelengkapan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateKelengkapanInput }) =>
      apiClient.patch<KelengkapanTemplate>(`/api/kelengkapan/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kelengkapan"] });
      toast.success("Template berhasil diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menyimpan template. Coba lagi.")),
  });
}

export function useDeleteKelengkapan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/kelengkapan/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kelengkapan"] });
      toast.success("Template berhasil dihapus.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menghapus template. Coba lagi.")),
  });
}
