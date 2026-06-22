"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listExpenseNature, setSifatBeban } from "@/lib/data/expense-nature";
import type { SifatBeban } from "@/lib/schemas/expense-nature";

export function useExpenseNatureList() {
  return useQuery({ queryKey: ["expense-nature"], queryFn: listExpenseNature });
}

export function useSetSifatBeban() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kategori, sifat }: { kategori: string; sifat: SifatBeban }) =>
      setSifatBeban(kategori, sifat),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expense-nature"] });
      toast.success("Sifat beban kategori diperbarui.");
    },
    onError: () => {
      toast.error("Gagal memperbarui sifat beban. Coba lagi.");
    },
  });
}
