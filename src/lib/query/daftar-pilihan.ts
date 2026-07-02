"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { listOptions, createOption, updateOption, deleteOption, moveOption } from "@/lib/data/daftar-pilihan";
import type { DaftarPilihanKategori, OptionExtra, OptionItem } from "@/lib/schemas/daftar-pilihan";

export function useOptionList(kategori: DaftarPilihanKategori, opts: { includeInactive?: boolean } = {}) {
  return useQuery({
    queryKey: ["daftar-pilihan", kategori, opts.includeInactive ?? false],
    queryFn: () => listOptions(kategori, opts),
  });
}

function invalidateKategori(qc: ReturnType<typeof useQueryClient>, kategori: DaftarPilihanKategori) {
  qc.invalidateQueries({ queryKey: ["daftar-pilihan", kategori] });
}

export function useCreateOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kategori, nama, extra }: { kategori: DaftarPilihanKategori; nama: string; extra?: OptionExtra }) =>
      createOption(kategori, nama, extra),
    onSuccess: (_data, variables) => {
      invalidateKategori(qc, variables.kategori);
      toast.success("Item ditambahkan.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Gagal menambahkan item.");
    },
  });
}

export function useUpdateOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, kategori: _kategori, patch }: { id: string; kategori: DaftarPilihanKategori; patch: Partial<Pick<OptionItem, "nama" | "aktif" | "extra">> }) =>
      updateOption(id, patch),
    onSuccess: (_data, variables) => {
      invalidateKategori(qc, variables.kategori);
      toast.success("Item diperbarui.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Gagal memperbarui item.");
    },
  });
}

export function useDeleteOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; kategori: DaftarPilihanKategori }) => deleteOption(id),
    onSuccess: (_data, variables) => {
      invalidateKategori(qc, variables.kategori);
      toast.success("Item dihapus.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus item.");
    },
  });
}

export function useMoveOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, direction }: { id: string; kategori: DaftarPilihanKategori; direction: "up" | "down" }) =>
      moveOption(id, direction),
    onSuccess: (_data, variables) => {
      invalidateKategori(qc, variables.kategori);
    },
    onError: () => {
      toast.error("Gagal mengubah urutan.");
    },
  });
}
