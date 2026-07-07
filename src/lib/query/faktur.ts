"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import type { FakturInduk, CreateFakturIndukInput, GenerateTerminInput, UpdateTerminInput } from "@/lib/schemas/faktur";

function apiErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useFakturList(proyekId?: string) {
  const qs = proyekId ? `?proyekId=${encodeURIComponent(proyekId)}` : "";
  return useQuery({
    queryKey: ["faktur", { proyekId }],
    queryFn: () => apiClient.get<FakturInduk[]>(`/api/faktur${qs}`),
  });
}

export function useFaktur(id: string, placeholderData?: FakturInduk) {
  return useQuery({
    queryKey: ["faktur", id],
    queryFn: () => apiClient.get<FakturInduk>(`/api/faktur/${id}`),
    ...(placeholderData ? { placeholderData } : {}),
    enabled: !!id,
  });
}

export function useCreateFakturInduk() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateFakturIndukInput) => apiClient.post<FakturInduk>("/api/faktur", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faktur"] });
      toast.success("Faktur Induk berhasil dibuat.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal membuat Faktur Induk.")),
  });
}

export function useGenerateTermin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ masterInvoiceId, input }: { masterInvoiceId: string; input: GenerateTerminInput }) =>
      apiClient.post<FakturInduk>(`/api/faktur/${masterInvoiceId}/termin`, input),
    onSuccess: (_, { masterInvoiceId }) => {
      qc.invalidateQueries({ queryKey: ["faktur", masterInvoiceId] });
      qc.invalidateQueries({ queryKey: ["faktur"] });
      toast.success("Invoice Termin berhasil dibuat.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal membuat Invoice Termin.")),
  });
}

export function useUpdateTermin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ masterInvoiceId, terminId, input }: { masterInvoiceId: string; terminId: string; input: UpdateTerminInput }) =>
      apiClient.patch<FakturInduk>(`/api/faktur/${masterInvoiceId}/termin/${terminId}`, input),
    onSuccess: (_, { masterInvoiceId }) => {
      qc.invalidateQueries({ queryKey: ["faktur", masterInvoiceId] });
      qc.invalidateQueries({ queryKey: ["faktur"] });
      qc.invalidateQueries({ queryKey: ["arus-kas"] });
      qc.invalidateQueries({ queryKey: ["tax-entries"] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal memperbarui Invoice Termin.")),
  });
}

/** Cancel a termin — a thin convenience wrapper over useUpdateTermin, resolves
 * the real "Batal" statusId via the caller's already-fetched status options. */
export function useCancelTermin() {
  const update = useUpdateTermin();
  return {
    ...update,
    cancel: (masterInvoiceId: string, terminId: string, batalStatusId: string) =>
      update.mutate({ masterInvoiceId, terminId, input: { statusId: batalStatusId } }),
  };
}

/** Called from Penawaran's delete flow (cleans up the Faktur Induk set born
 * from the deleted SPH's project) — same composability pattern as
 * query/proyek.ts's cancelProyekBySph plain-async-function export. */
export function useDeleteFakturBySph() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sphId: string) => apiClient.post("/api/faktur/delete-by-sph", { sphId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["faktur"] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menghapus faktur terkait.")),
  });
}
