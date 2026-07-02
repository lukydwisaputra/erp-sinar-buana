"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getPengirimanConfig, testEmailConnection, updateEmailAkun, updateEmailTemplate } from "@/lib/data/pengiriman-config";
import type { EmailAkun, EmailTemplate } from "@/lib/schemas/pengiriman-config";
import type { JenisDokumenKirim } from "@/lib/schemas/pengiriman";

const KEY = ["pengiriman-config"];

export function usePengirimanConfig() {
  return useQuery({ queryKey: KEY, queryFn: getPengirimanConfig });
}

export function useTestEmailConnection() {
  return useMutation({ mutationFn: (input: Omit<EmailAkun, "terkonfigurasi">) => testEmailConnection(input) });
}

export function useUpdateEmailAkun() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<EmailAkun, "terkonfigurasi">) => updateEmailAkun(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Akun email pengirim diperbarui.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui akun email.");
    },
  });
}

export function useUpdateEmailTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jenis, template }: { jenis: JenisDokumenKirim; template: EmailTemplate }) => updateEmailTemplate(jenis, template),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Template pesan diperbarui.");
    },
    onError: () => {
      toast.error("Gagal memperbarui template pesan.");
    },
  });
}
