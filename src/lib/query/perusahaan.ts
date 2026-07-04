"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import type {
  Perusahaan,
  CreatePerusahaanInput,
  UpdatePerusahaanInput,
} from "@/lib/schemas/perusahaan";

function apiErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function usePerusahaanList() {
  return useQuery({
    queryKey: ["perusahaan"],
    queryFn: () => apiClient.get<Perusahaan[]>("/api/perusahaan"),
  });
}

export function useCreatePerusahaan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePerusahaanInput) =>
      apiClient.post<Perusahaan>("/api/perusahaan", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perusahaan"] });
      toast.success("Perusahaan berhasil ditambahkan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menambahkan perusahaan.")),
  });
}

export function useUpdatePerusahaan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePerusahaanInput }) =>
      apiClient.patch<Perusahaan>(`/api/perusahaan/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perusahaan"] });
      toast.success("Perusahaan berhasil diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal memperbarui perusahaan.")),
  });
}

export function useDeletePerusahaan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/perusahaan/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perusahaan"] });
      toast.success("Perusahaan berhasil dihapus.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menghapus perusahaan.")),
  });
}
