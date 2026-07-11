"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { Sph, SphStatus, CreatePenawaranInput, UpdatePenawaranInput } from "@/lib/schemas/penawaran";

export function usePenawaranList() {
  return useQuery({
    queryKey: ["penawaran"],
    queryFn: () => apiClient.get<Sph[]>("/api/penawaran"),
  });
}

export function useSph(id: string, placeholderData?: Sph) {
  return useQuery({
    queryKey: ["penawaran", id],
    queryFn: () => apiClient.get<Sph>(`/api/penawaran/${id}`),
    placeholderData,
    enabled: !!id,
  });
}

export function useCreatePenawaran() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePenawaranInput) => apiClient.post<Sph>("/api/penawaran", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["penawaran"] });
      toast.success("Penawaran berhasil disimpan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menyimpan penawaran.")),
  });
}

export function useUpdatePenawaran() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePenawaranInput }) =>
      apiClient.patch<Sph>(`/api/penawaran/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["penawaran"] });
      toast.success("Penawaran berhasil diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal memperbarui penawaran.")),
  });
}

export function useUpdatePenawaranStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SphStatus }) =>
      apiClient.patch<Sph>(`/api/penawaran/${id}`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["penawaran"] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal mengubah status.")),
  });
}

export function useDeletePenawaran() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/penawaran/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["penawaran"] });
      toast.success("Penawaran berhasil dihapus.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menghapus penawaran.")),
  });
}
