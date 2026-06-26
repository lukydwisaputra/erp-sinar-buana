"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listKaryawan,
  createKaryawan,
  updateKaryawan,
  deactivateKaryawan,
  type ListKaryawanParams,
  type CreateKaryawanInput,
  type UpdateKaryawanInput,
} from "@/lib/data/karyawan";

export function useKaryawanList(params: ListKaryawanParams = {}) {
  return useQuery({ queryKey: ["karyawan", params], queryFn: () => listKaryawan(params) });
}

export function useCreateKaryawan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateKaryawanInput) => createKaryawan(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["karyawan"] });
      toast.success("Karyawan berhasil ditambahkan.");
    },
    onError: () => {
      toast.error("Gagal menambahkan karyawan. Coba lagi.");
    },
  });
}

export function useUpdateKaryawan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateKaryawanInput }) =>
      updateKaryawan(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["karyawan"] });
      toast.success("Data karyawan berhasil diperbarui.");
    },
    onError: () => {
      toast.error("Gagal memperbarui karyawan. Coba lagi.");
    },
  });
}

export function useDeleteKaryawan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deactivateKaryawan(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["karyawan"] });
      toast.success("Karyawan berhasil dinonaktifkan.");
    },
    onError: () => {
      toast.error("Gagal menonaktifkan karyawan. Coba lagi.");
    },
  });
}
