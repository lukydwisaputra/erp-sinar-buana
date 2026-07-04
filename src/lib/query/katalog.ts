"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import type { Layanan, CreateLayananInput, UpdateLayananInput } from "@/lib/schemas/katalog";

function apiErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useKatalogList() {
  return useQuery({
    queryKey: ["katalog"],
    queryFn: () => apiClient.get<Layanan[]>("/api/katalog"),
  });
}

export function useCreateLayanan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateLayananInput) => apiClient.post<Layanan>("/api/katalog", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["katalog"] });
      toast.success("Layanan berhasil ditambahkan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menambahkan layanan.")),
  });
}

export function useUpdateLayanan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLayananInput }) =>
      apiClient.patch<Layanan>(`/api/katalog/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["katalog"] });
      toast.success("Layanan berhasil diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal memperbarui layanan.")),
  });
}

export function useDeleteLayanan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/katalog/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["katalog"] });
      toast.success("Layanan berhasil dihapus.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menghapus layanan.")),
  });
}
