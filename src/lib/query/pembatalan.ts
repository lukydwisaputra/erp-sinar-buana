"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type { CancelPembatalanInput } from "@/lib/schemas/pembatalan";

/** Cascading cancel — fired from any one of SPH/Proyek/Faktur, invalidates
 * all three query spaces since the cascade updates all of them together. */
export function useCancelPembatalan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CancelPembatalanInput) => apiClient.post("/api/pembatalan", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["penawaran"] });
      qc.invalidateQueries({ queryKey: ["proyek"] });
      qc.invalidateQueries({ queryKey: ["faktur"] });
      qc.invalidateQueries({ queryKey: ["arus-kas"] });
      toast.success("Pembatalan berhasil disimpan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal membatalkan. Coba lagi.")),
  });
}
