"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listPenawaran,
  getPenawaran,
  updatePenawaranStatus,
  deletePenawaran,
  type ListPenawaranParams,
} from "@/lib/data/penawaran";
import type { Sph, SphStatus } from "@/lib/schemas/penawaran";

export function usePenawaranList(params: ListPenawaranParams = {}) {
  return useQuery({
    queryKey: ["penawaran", params],
    queryFn: () => listPenawaran(params),
  });
}

export function useSph(id: string, placeholderData?: Sph) {
  return useQuery({
    queryKey: ["penawaran", id],
    queryFn: () => getPenawaran(id),
    placeholderData,
    enabled: !!id,
  });
}

export function useUpdatePenawaranStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SphStatus }) =>
      updatePenawaranStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["penawaran"] });
      qc.invalidateQueries({ queryKey: ["faktur"] });
      qc.invalidateQueries({ queryKey: ["proyek"] });
    },
    onError: () => {
      toast.error("Gagal mengubah status. Coba lagi.");
    },
  });
}

export function useDeletePenawaran() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePenawaran(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["penawaran"] });
    },
    onError: () => {
      toast.error("Gagal menghapus penawaran. Coba lagi.");
    },
  });
}
