"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listExpenseNature, listExpenseNatureRows, setSifatBeban, createKategoriArusKas, deleteKategoriArusKas,
} from "@/lib/data/expense-nature";
import type { SifatBeban } from "@/lib/schemas/expense-nature";

export function useExpenseNatureList() {
  return useQuery({ queryKey: ["expense-nature"], queryFn: listExpenseNature });
}

export function useKategoriArusKasList() {
  return useQuery({ queryKey: ["expense-nature", "rows"], queryFn: listExpenseNatureRows });
}

function invalidateExpenseNature(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["expense-nature"] }); // matches both ["expense-nature"] and ["expense-nature","rows"]
}

export function useCreateKategoriArusKas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kategori, sifat }: { kategori: string; sifat: SifatBeban }) => createKategoriArusKas(kategori, sifat),
    onSuccess: () => {
      invalidateExpenseNature(qc);
      toast.success("Kategori Arus Kas ditambahkan.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Gagal menambahkan kategori.");
    },
  });
}

export function useDeleteKategoriArusKas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (kategori: string) => deleteKategoriArusKas(kategori),
    onSuccess: () => {
      invalidateExpenseNature(qc);
      toast.success("Kategori Arus Kas dihapus.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus kategori.");
    },
  });
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
