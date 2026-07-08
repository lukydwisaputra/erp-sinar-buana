"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api-client";
import type { CashflowCategoryRow, CreateCashflowCategoryInput, SifatBeban } from "@/lib/schemas/expense-nature";

const KEY = ["cashflow-categories"];

export function useKategoriArusKasList() {
  return useQuery({
    queryKey: KEY,
    queryFn: () => apiClient.get<CashflowCategoryRow[]>("/api/arus-kas/categories"),
  });
}

export function useCreateKategoriArusKas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCashflowCategoryInput) =>
      apiClient.post<CashflowCategoryRow>("/api/arus-kas/categories", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
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
    mutationFn: (id: string) => apiClient.delete(`/api/arus-kas/categories/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
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
    mutationFn: ({ id, sifat }: { id: string; sifat: SifatBeban }) =>
      apiClient.patch<CashflowCategoryRow>(`/api/arus-kas/categories/${id}`, { sifat }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Sifat beban kategori diperbarui.");
    },
    onError: () => {
      toast.error("Gagal memperbarui sifat beban. Coba lagi.");
    },
  });
}
