"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listBatch, getBatch, getSlip, createBatch, deleteBatch, updateSlip, markSlipDibayar,
  type CreateBatchInput, type SlipEditFields,
} from "@/lib/data/penggajian";

export function useBatchList() {
  return useQuery({ queryKey: ["penggajian"], queryFn: listBatch });
}

export function useBatch(id: string) {
  return useQuery({ queryKey: ["penggajian", id], queryFn: () => getBatch(id) });
}

export function useSlip(batchId: string, slipId: string) {
  return useQuery({
    queryKey: ["penggajian", batchId, slipId],
    queryFn: () => getSlip(batchId, slipId),
  });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBatchInput) => createBatch(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["penggajian"] }); },
    onError: () => { toast.error("Gagal membuat penggajian. Coba lagi."); },
  });
}

export function useDeleteBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBatch(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["penggajian"] }); },
    onError: () => { toast.error("Gagal menghapus penggajian. Coba lagi."); },
  });
}

export function useUpdateSlip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, slipId, patch }: {
      batchId: string; slipId: string; patch: SlipEditFields;
    }) => updateSlip(batchId, slipId, patch),
    onSuccess: (_, { batchId }) => {
      qc.invalidateQueries({ queryKey: ["penggajian", batchId] });
    },
    onError: () => { toast.error("Gagal menyimpan perubahan. Coba lagi."); },
  });
}

export function useMarkSlipDibayar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, slipId }: { batchId: string; slipId: string }) =>
      markSlipDibayar(batchId, slipId),
    onSuccess: (_, { batchId }) => {
      qc.invalidateQueries({ queryKey: ["penggajian", batchId] });
      qc.invalidateQueries({ queryKey: ["penggajian"] });
    },
    onError: () => { toast.error("Gagal menandai dibayar. Coba lagi."); },
  });
}
