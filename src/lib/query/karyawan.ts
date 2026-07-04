"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import type { Karyawan, CreateKaryawanInput, UpdateKaryawanInput } from "@/lib/schemas/karyawan";

function apiErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useKaryawanList() {
  return useQuery({
    queryKey: ["karyawan"],
    queryFn: () => apiClient.get<Karyawan[]>("/api/karyawan"),
  });
}

export function useCreateKaryawan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateKaryawanInput) => apiClient.post<Karyawan>("/api/karyawan", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["karyawan"] });
      toast.success("Karyawan berhasil ditambahkan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menambahkan karyawan.")),
  });
}

export function useUpdateKaryawan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateKaryawanInput }) =>
      apiClient.patch<Karyawan>(`/api/karyawan/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["karyawan"] });
      toast.success("Data karyawan berhasil diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal memperbarui karyawan.")),
  });
}

/** Karyawan has no hard delete — this archives the employee (isActive: false)
 * via PATCH, matching the mock's deactivate-only behavior. */
export function useDeleteKaryawan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch<Karyawan>(`/api/karyawan/${id}`, { status: "terarsip" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["karyawan"] });
      toast.success("Karyawan berhasil dinonaktifkan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menonaktifkan karyawan.")),
  });
}
