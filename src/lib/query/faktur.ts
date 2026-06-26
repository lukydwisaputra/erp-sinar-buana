"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listFaktur, getFaktur, updateFaktur, updateFakturStatus, cancelAllFakturBySph, deleteAllFakturBySph } from "@/lib/data/faktur";
import type { Faktur } from "@/lib/schemas/faktur";
import { updatePenawaranStatus } from "@/lib/data/penawaran";
import { cancelProyekBySph } from "@/lib/data/proyek";

export function useFakturList(q?: string) {
  return useQuery({ queryKey: ["faktur", { q }], queryFn: () => listFaktur({ q }) });
}

export function useFaktur(id: string, placeholderData?: import("@/lib/schemas/faktur").Faktur) {
  return useQuery({
    queryKey: ["faktur", id],
    queryFn: () => getFaktur(id),
    placeholderData,
    enabled: !!id,
  });
}

export function useUpdateFaktur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<Faktur, "id">> }) =>
      updateFaktur(id, patch),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["faktur"] });
      qc.invalidateQueries({ queryKey: ["faktur", id] });
    },
    onError: () => {
      toast.error("Gagal menyimpan faktur. Coba lagi.");
    },
  });
}

/** Cancel a faktur and its linked penawaran in one atomic mutation. */
export function useCancelFaktur() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ fakturId, sphId }: { fakturId: string; sphId: string }) => {
      if (sphId) {
        await cancelAllFakturBySph(sphId);
        await updatePenawaranStatus(sphId, "dibatalkan");
        await cancelProyekBySph(sphId);
      } else {
        await updateFakturStatus(fakturId, "dibatalkan");
      }
    },
    onSuccess: (_, { fakturId, sphId }) => {
      qc.invalidateQueries({ queryKey: ["faktur"] });
      qc.invalidateQueries({ queryKey: ["faktur", fakturId] });
      qc.invalidateQueries({ queryKey: ["penawaran"] });
      if (sphId) qc.invalidateQueries({ queryKey: ["penawaran", sphId] });
      qc.invalidateQueries({ queryKey: ["proyek"] });
    },
    onError: () => {
      toast.error("Gagal membatalkan faktur. Coba lagi.");
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
    onError: () => {
      toast.error("Gagal menghapus faktur terkait. Coba lagi.");
    },
  });
}
