"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listKewajibanPajak, setKewajibanStatus } from "@/lib/data/kewajiban-pajak";
import type { KewajibanStatus } from "@/lib/schemas/kewajiban-pajak";

export function useKewajibanPajakList() {
  return useQuery({ queryKey: ["kewajiban-pajak"], queryFn: listKewajibanPajak });
}

export function useSetKewajibanStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: KewajibanStatus }) =>
      setKewajibanStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kewajiban-pajak"] });
      toast.success("Status kewajiban pajak diperbarui.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui status.");
    },
  });
}
