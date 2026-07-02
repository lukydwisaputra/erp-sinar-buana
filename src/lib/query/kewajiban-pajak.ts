"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listKewajibanPajak, createKewajibanPajak, setKewajibanStatus, setBuktiPotong } from "@/lib/data/kewajiban-pajak";
import type { KewajibanPajak, KewajibanStatus } from "@/lib/schemas/kewajiban-pajak";

export function useKewajibanPajakList() {
  return useQuery({ queryKey: ["kewajiban-pajak"], queryFn: listKewajibanPajak });
}

export function useCreateKewajibanPajak() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<KewajibanPajak, "id">) => createKewajibanPajak(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kewajiban-pajak"] });
      toast.success("Kewajiban pajak ditambahkan.");
    },
    onError: () => {
      toast.error("Gagal menambahkan kewajiban pajak.");
    },
  });
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

export function useSetBuktiPotong() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, diterima }: { id: string; diterima: boolean }) =>
      setBuktiPotong(id, diterima),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["kewajiban-pajak"] });
      toast.success("Status bukti potong diperbarui.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui bukti potong.");
    },
  });
}
