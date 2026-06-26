"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listKatalog, updateLayanan, deleteLayanan, type ListKatalogParams, type UpdateLayananInput } from "@/lib/data/katalog";

export function useKatalogList(params: ListKatalogParams = {}) {
  return useQuery({ queryKey: ["katalog", params], queryFn: () => listKatalog(params) });
}

export function useUpdateLayanan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateLayananInput }) =>
      updateLayanan(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["katalog"] });
      toast.success("Layanan berhasil diperbarui.");
    },
    onError: () => {
      toast.error("Gagal memperbarui layanan. Coba lagi.");
    },
  });
}

export function useDeleteLayanan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteLayanan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["katalog"] });
      toast.success("Layanan berhasil dihapus.");
    },
    onError: () => {
      toast.error("Gagal menghapus layanan. Coba lagi.");
    },
  });
}
