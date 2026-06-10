"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listPenawaran,
  updatePenawaranStatus,
  type ListPenawaranParams,
} from "@/lib/data/penawaran";
import type { SphStatus } from "@/lib/schemas/penawaran";

export function usePenawaranList(params: ListPenawaranParams = {}) {
  return useQuery({
    queryKey: ["penawaran", params],
    queryFn: () => listPenawaran(params),
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
    },
  });
}
