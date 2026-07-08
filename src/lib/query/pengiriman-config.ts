"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type {
  PengirimanConfig,
  UpdateEmailAkunInput,
  TestEmailConnectionInput,
  UpdateTemplateInput,
  MessageTemplateDto,
} from "@/lib/schemas/pengiriman-config";

const KEY = ["pengiriman-config"];

export function usePengirimanConfig() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiClient.get<PengirimanConfig>("/api/pengiriman-config"),
  });
}

export function useTestEmailConnection() {
  return useMutation({
    mutationFn: (input: TestEmailConnectionInput) =>
      apiClient.post<{ ok: boolean; message: string }>("/api/pengiriman-config/test-connection", input),
  });
}

export function useUpdateEmailAkun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateEmailAkunInput) =>
      apiClient.patch<PengirimanConfig["emailAkun"]>("/api/pengiriman-config/email-akun", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Akun email pengirim diperbarui.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui akun email.");
    },
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateTemplateInput) =>
      apiClient.patch<MessageTemplateDto>("/api/pengiriman-config/template", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Template pesan diperbarui.");
    },
    onError: () => {
      toast.error("Gagal memperbarui template pesan.");
    },
  });
}
