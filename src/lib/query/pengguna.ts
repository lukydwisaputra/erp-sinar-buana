"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type {
  CreatePenggunaInput,
  UpdatePenggunaInput,
  AkunStatus,
} from "@/lib/schemas/pengguna";
import type { AppRole } from "@/lib/schemas/pengguna";

export type PenggunaAccount = {
  id: string;
  email: string | null;
  fullName: string;
  role: AppRole;
  employeeId: string | null;
  clientCompanyId: string | null;
  isActive: boolean;
  hasPasswordSet: boolean;
  status: AkunStatus;
};

export type CreatedPenggunaAccount = PenggunaAccount & { inviteToken: string };

export function usePenggunaList() {
  return useQuery({
    queryKey: ["pengguna"],
    queryFn: () => apiClient.get<PenggunaAccount[]>("/api/pengguna"),
  });
}

export function useCreatePengguna() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePenggunaInput) =>
      apiClient.post<CreatedPenggunaAccount>("/api/pengguna", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pengguna"] });
      toast.success("Akun berhasil dibuat.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal membuat akun.")),
  });
}

export function useUpdatePengguna() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePenggunaInput }) =>
      apiClient.patch(`/api/pengguna/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pengguna"] });
      toast.success("Akun berhasil diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal memperbarui akun.")),
  });
}

export function useSetPenggunaActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiClient.patch(`/api/pengguna/${id}`, { isActive }),
    onSuccess: (_data, { isActive }) => {
      qc.invalidateQueries({ queryKey: ["pengguna"] });
      toast.success(isActive ? "Akun diaktifkan kembali." : "Akun dinonaktifkan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal mengubah status akun.")),
  });
}

export function useResendInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.post<{ inviteToken: string }>(`/api/pengguna/${id}/invite`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pengguna"] }),
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal mengirim ulang undangan.")),
  });
}

export function useAdminResetPassword() {
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ resetToken: string }>(`/api/pengguna/${id}/reset-password`),
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal membuat tautan atur ulang sandi.")),
  });
}
