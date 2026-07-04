"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";

export type SessionUser = {
  id: string;
  fullName: string;
  role: "admin" | "keuangan" | "sales" | "tim_teknis" | "viewer";
  employeeId: string | null;
  isActive: boolean;
};

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => apiClient.get<SessionUser>("/api/auth/session"),
    retry: false,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { email: string; password: string }) =>
      apiClient.post("/api/auth/login", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["session"] });
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : "Gagal masuk. Coba lagi.");
    },
  });
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: (input: { token: string; password: string }) =>
      apiClient.post("/api/auth/accept-invite", input),
  });
}

export function useRequestReset() {
  return useMutation({
    mutationFn: (input: { email: string }) => apiClient.post("/api/auth/request-reset", input),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (input: { token: string; password: string }) =>
      apiClient.post("/api/auth/reset-password", input),
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post("/api/auth/logout"),
    onSuccess: () => {
      qc.setQueryData(["session"], null);
      qc.invalidateQueries({ queryKey: ["session"] });
    },
  });
}
