"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getPenomoranConfig, updatePenomoranFormat } from "@/lib/data/penomoran";
import type { DocTypePenomoran } from "@/lib/schemas/penomoran-config";

export function usePenomoranConfig() {
  return useQuery({ queryKey: ["penomoran-config"], queryFn: getPenomoranConfig });
}

export function useUpdatePenomoranFormat() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docType, format }: { docType: DocTypePenomoran; format: string }) => updatePenomoranFormat(docType, format),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["penomoran-config"] });
      toast.success("Format penomoran diperbarui.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui format penomoran.");
    },
  });
}
