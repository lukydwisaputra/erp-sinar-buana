"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import type { SettleTaxEntryInput, TaxEntry } from "@/lib/schemas/tax-entries";

/** Rows are produced by Faktur's LUNAS automation; manual entry and file
 * upload (proofAttachmentUrl/buktiPotongAttachmentUrl) are out of scope.
 * Query key stays "tax-entries" — query/faktur.ts's useUpdateTermin already
 * invalidates it when a termin is marked Lunas/Batal. */
export function useTaxEntryList(enabled = true) {
  return useQuery({
    queryKey: ["tax-entries"],
    queryFn: () => apiClient.get<TaxEntry[]>("/api/tax-entries"),
    enabled,
    retry: false,
  });
}

function apiErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useSettleTaxEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: SettleTaxEntryInput }) =>
      apiClient.patch<TaxEntry>(`/api/tax-entries/${id}`, { action: "settle", ...input }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tax-entries"] });
      toast.success("Kewajiban pajak ditandai selesai.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menandai selesai. Coba lagi.")),
  });
}

export function useUnsettleTaxEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<TaxEntry>(`/api/tax-entries/${id}`, { action: "unsettle" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tax-entries"] });
      toast.success("Status setor dibatalkan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal membatalkan. Coba lagi.")),
  });
}

export function useUpdateBuktiPotong() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, received }: { id: string; received: boolean }) =>
      apiClient.patch<TaxEntry>(`/api/tax-entries/${id}`, { action: "bukti-potong", received }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tax-entries"] });
      toast.success("Status bukti potong diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal memperbarui bukti potong. Coba lagi.")),
  });
}
