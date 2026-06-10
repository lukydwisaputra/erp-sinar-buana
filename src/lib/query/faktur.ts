"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listFaktur, updateFakturStatus, deleteAllFakturBySph } from "@/lib/data/faktur";
import { updatePenawaranStatus } from "@/lib/data/penawaran";

export function useFakturList(q?: string) {
  return useQuery({ queryKey: ["faktur", { q }], queryFn: () => listFaktur({ q }) });
}

/** Cancel a faktur and its linked penawaran in one atomic mutation. */
export function useCancelFaktur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fakturId, sphId }: { fakturId: string; sphId: string }) => {
      await updateFakturStatus(fakturId, "dibatalkan");
      if (sphId) await updatePenawaranStatus(sphId, "dibatalkan");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faktur"] });
      qc.invalidateQueries({ queryKey: ["penawaran"] });
    },
  });
}

/** Remove all fakturs linked to a deal SPH (called before deleting a dibatalkan penawaran). */
export function useDeleteFakturBySph() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sphId: string) => deleteAllFakturBySph(sphId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faktur"] });
    },
  });
}
