"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listKelengkapan,
  createKelengkapan,
  updateKelengkapan,
  deleteKelengkapan,
} from "@/lib/data/kelengkapan";
import type { KelengkapanTemplate } from "@/lib/schemas/kelengkapan";

export function useKelengkapanList() {
  return useQuery({
    queryKey: ["kelengkapan"],
    queryFn: listKelengkapan,
  });
}

export function useCreateKelengkapan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<KelengkapanTemplate, "id">) => createKelengkapan(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["kelengkapan"] }); },
    onError: () => { toast.error("Gagal menyimpan template. Coba lagi."); },
  });
}

export function useUpdateKelengkapan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: Omit<KelengkapanTemplate, "id"> }) =>
      updateKelengkapan(id, input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["kelengkapan"] }); },
    onError: () => { toast.error("Gagal menyimpan template. Coba lagi."); },
  });
}

export function useDeleteKelengkapan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteKelengkapan(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["kelengkapan"] }); },
    onError: () => { toast.error("Gagal menghapus template. Coba lagi."); },
  });
}
