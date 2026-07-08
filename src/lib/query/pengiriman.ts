"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { PengirimanLog, CreateDeliveryInput } from "@/lib/schemas/pengiriman";

const KEY = ["pengiriman"];

export function usePengirimanLog() {
  return useQuery({ queryKey: KEY, queryFn: () => apiClient.get<PengirimanLog[]>("/api/pengiriman") });
}

export function useCreateWhatsappDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDeliveryInput) =>
      apiClient.post<PengirimanLog>("/api/pengiriman/whatsapp", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCreateEmailDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDeliveryInput) =>
      apiClient.post<PengirimanLog>("/api/pengiriman/email", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
