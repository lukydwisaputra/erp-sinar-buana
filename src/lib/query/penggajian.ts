"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type {
  PenggajianBatch, SlipGaji, CreateBatchInput, UpdateSlipInput, CreateComponentInput,
} from "@/lib/schemas/penggajian";

export function useBatchList() {
  return useQuery({
    queryKey: ["penggajian"],
    queryFn: () => apiClient.get<PenggajianBatch[]>("/api/penggajian"),
  });
}

export function useBatch(id: string) {
  return useQuery({
    queryKey: ["penggajian", id],
    queryFn: () => apiClient.get<PenggajianBatch>(`/api/penggajian/${encodeURIComponent(id)}`),
    enabled: !!id,
  });
}

export function useSlip(batchId: string, slipId: string) {
  return useQuery({
    queryKey: ["penggajian", batchId, slipId],
    queryFn: () => apiClient.get<SlipGaji>(`/api/penggajian/${encodeURIComponent(batchId)}/${slipId}`),
    enabled: !!batchId && !!slipId,
  });
}

/** Resolves an employee's configured salary components into prefillable
 * default line items for the batch-creation wizard. */
export function useEmployeeDefaults(employeeId: string) {
  return useQuery({
    queryKey: ["penggajian", "defaults", employeeId],
    queryFn: () => apiClient.get<CreateComponentInput[]>(`/api/penggajian/defaults/${employeeId}`),
    enabled: !!employeeId,
  });
}

export function useCreateBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBatchInput) => apiClient.post<PenggajianBatch>("/api/penggajian", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["penggajian"] });
      toast.success("Penggajian berhasil dibuat.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal membuat penggajian.")),
  });
}

export function useUpdateSlip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, slipId, patch }: { batchId: string; slipId: string; patch: UpdateSlipInput }) =>
      apiClient.patch<SlipGaji>(`/api/penggajian/${encodeURIComponent(batchId)}/${slipId}`, patch),
    onSuccess: (_, { batchId }) => {
      qc.invalidateQueries({ queryKey: ["penggajian", batchId] });
      qc.invalidateQueries({ queryKey: ["penggajian"] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menyimpan perubahan.")),
  });
}

export function useMarkSlipDibayar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, slipId }: { batchId: string; slipId: string }) =>
      apiClient.post<SlipGaji>(`/api/penggajian/${encodeURIComponent(batchId)}/${slipId}/dibayar`, {}),
    onSuccess: (_, { batchId }) => {
      qc.invalidateQueries({ queryKey: ["penggajian", batchId] });
      qc.invalidateQueries({ queryKey: ["penggajian"] });
      qc.invalidateQueries({ queryKey: ["arus-kas"] });
      qc.invalidateQueries({ queryKey: ["tax-entries"] });
      toast.success("Slip berhasil ditandai dibayar.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menandai dibayar.")),
  });
}

export function useCancelSlip() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ batchId, slipId }: { batchId: string; slipId: string }) =>
      apiClient.post<SlipGaji>(`/api/penggajian/${encodeURIComponent(batchId)}/${slipId}/batal`, {}),
    onSuccess: (_, { batchId }) => {
      qc.invalidateQueries({ queryKey: ["penggajian", batchId] });
      qc.invalidateQueries({ queryKey: ["penggajian"] });
      toast.success("Slip berhasil dibatalkan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal membatalkan slip.")),
  });
}

export function useCancelBatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (batchId: string) =>
      apiClient.post<PenggajianBatch>(`/api/penggajian/${encodeURIComponent(batchId)}/batal`, {}),
    onSuccess: (_, batchId) => {
      qc.invalidateQueries({ queryKey: ["penggajian", batchId] });
      qc.invalidateQueries({ queryKey: ["penggajian"] });
      qc.invalidateQueries({ queryKey: ["arus-kas"] });
      qc.invalidateQueries({ queryKey: ["tax-entries"] });
      toast.success("Batch berhasil dibatalkan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal membatalkan batch.")),
  });
}
