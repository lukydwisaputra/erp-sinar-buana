"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listPerusahaan,
  updatePerusahaan,
  deletePerusahaan,
  type ListPerusahaanParams,
  type UpdatePerusahaanInput,
} from "@/lib/data/perusahaan";

export function usePerusahaanList(params: ListPerusahaanParams = {}) {
  return useQuery({
    queryKey: ["perusahaan", params],
    queryFn: () => listPerusahaan(params),
  });
}

export function useUpdatePerusahaan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePerusahaanInput }) =>
      updatePerusahaan(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perusahaan"] });
      toast.success("Perusahaan berhasil diperbarui.");
    },
    onError: () => {
      toast.error("Gagal memperbarui perusahaan. Coba lagi.");
    },
  });
}

export function useDeletePerusahaan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePerusahaan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["perusahaan"] });
      toast.success("Perusahaan berhasil dihapus.");
    },
    onError: () => {
      toast.error("Gagal menghapus perusahaan. Coba lagi.");
    },
  });
}
