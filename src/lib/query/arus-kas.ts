"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listArusKas, createArusKas, removeArusKas } from "@/lib/data/arus-kas";
import type { ArusKasFormValues } from "@/lib/schemas/arus-kas";

export function useArusKasList() {
  return useQuery({ queryKey: ["arus-kas"], queryFn: listArusKas });
}

export function useCreateArusKas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ArusKasFormValues) => createArusKas(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["arus-kas"] });
      toast.success("Transaksi berhasil ditambahkan.");
    },
    onError: () => { toast.error("Gagal menambahkan transaksi. Coba lagi."); },
  });
}

export function useRemoveArusKas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeArusKas(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["arus-kas"] });
      toast.success("Transaksi berhasil dihapus.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus transaksi.");
    },
  });
}
