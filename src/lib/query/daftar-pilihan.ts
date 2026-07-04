"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import type { DaftarPilihanKategori, OptionExtra, OptionItem } from "@/lib/schemas/daftar-pilihan";

function apiErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useOptionList(kategori: DaftarPilihanKategori, opts: { includeInactive?: boolean } = {}) {
  return useQuery({
    queryKey: ["daftar-pilihan", kategori, opts.includeInactive ?? false],
    queryFn: () =>
      apiClient.get<OptionItem[]>(
        `/api/daftar-pilihan/${kategori}${opts.includeInactive ? "?includeInactive=true" : ""}`,
      ),
  });
}

function invalidateKategori(qc: ReturnType<typeof useQueryClient>, kategori: DaftarPilihanKategori) {
  qc.invalidateQueries({ queryKey: ["daftar-pilihan", kategori] });
}

export function useCreateOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ kategori, nama, extra }: { kategori: DaftarPilihanKategori; nama: string; extra?: OptionExtra }) =>
      apiClient.post<OptionItem>(`/api/daftar-pilihan/${kategori}`, { nama, extra }),
    onSuccess: (_data, variables) => {
      invalidateKategori(qc, variables.kategori);
      toast.success("Item ditambahkan.");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Gagal menambahkan item.")),
  });
}

export function useUpdateOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, kategori, patch }: { id: string; kategori: DaftarPilihanKategori; patch: Partial<Pick<OptionItem, "nama" | "aktif" | "extra">> }) =>
      apiClient.patch<OptionItem>(`/api/daftar-pilihan/${kategori}/${id}`, patch),
    onSuccess: (_data, variables) => {
      invalidateKategori(qc, variables.kategori);
      toast.success("Item diperbarui.");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Gagal memperbarui item.")),
  });
}

export function useDeleteOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, kategori }: { id: string; kategori: DaftarPilihanKategori }) =>
      apiClient.delete(`/api/daftar-pilihan/${kategori}/${id}`),
    onSuccess: (_data, variables) => {
      invalidateKategori(qc, variables.kategori);
      toast.success("Item dihapus.");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Gagal menghapus item.")),
  });
}

export function useMoveOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, kategori, direction }: { id: string; kategori: DaftarPilihanKategori; direction: "up" | "down" }) =>
      apiClient.post<OptionItem[]>(`/api/daftar-pilihan/${kategori}/${id}/pindah`, { direction }),
    onSuccess: (_data, variables) => {
      invalidateKategori(qc, variables.kategori);
    },
    onError: () => toast.error("Gagal mengubah urutan."),
  });
}
