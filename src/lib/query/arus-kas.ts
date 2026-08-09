"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { ArusKasEntry, CreateArusKasEntryInput, UpdateArusKasEntryInput } from "@/lib/schemas/arus-kas";

// Query key stays "arus-kas" — query/faktur.ts's useUpdateTermin already
// invalidates it when a termin is marked Lunas/Batal.
export function useArusKasList() {
  return useQuery({
    queryKey: ["arus-kas"],
    queryFn: () => apiClient.get<ArusKasEntry[]>("/api/arus-kas"),
  });
}

export function useCreateArusKas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateArusKasEntryInput) => apiClient.post<ArusKasEntry>("/api/arus-kas", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["arus-kas"] });
      toast.success("Transaksi berhasil ditambahkan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menambahkan transaksi.")),
  });
}

export function useUpdateArusKas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateArusKasEntryInput }) =>
      apiClient.patch<ArusKasEntry>(`/api/arus-kas/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["arus-kas"] });
      toast.success("Transaksi berhasil diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal memperbarui transaksi.")),
  });
}

export function useRemoveArusKas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/api/arus-kas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["arus-kas"] });
      toast.success("Transaksi berhasil dihapus.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menghapus transaksi.")),
  });
}
