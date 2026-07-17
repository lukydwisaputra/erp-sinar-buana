"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, apiErrorMessage, ApiError } from "@/lib/api-client";
import type { Karyawan, CreateKaryawanInput, UpdateKaryawanInput } from "@/lib/schemas/karyawan";

/** Multipart upload, same shape as company-profile's useUploadLogo — bypasses
 * apiClient's hardcoded JSON content type. */
export function useUploadKontrak() {
  return useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/karyawan/kontrak", { method: "POST", body: form });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new ApiError(body?.error ?? "Gagal mengunggah surat kontrak.", res.status);
      return body as { url: string; fileName: string };
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal mengunggah surat kontrak. Coba lagi.")),
  });
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
