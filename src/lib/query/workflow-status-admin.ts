"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, ApiError } from "@/lib/api-client";
import type {
  WorkflowStatusRow, WorkflowStatusEntityAdmin, CreateWorkflowStatusInput, UpdateWorkflowStatusInput,
} from "@/lib/schemas/workflow-status-admin";

function apiErrorMessage(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

export function useWorkflowStatusAdminList(entity: WorkflowStatusEntityAdmin) {
  return useQuery({
    queryKey: ["workflow-status-admin", entity],
    queryFn: () => apiClient.get<WorkflowStatusRow[]>(`/api/workflow-status?entity=${entity}&includeInactive=true`),
  });
}

export function useCreateWorkflowStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateWorkflowStatusInput) =>
      apiClient.post<WorkflowStatusRow>("/api/workflow-status", input),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["workflow-status-admin", row.entity] });
      qc.invalidateQueries({ queryKey: ["workflow-status", row.entity] });
      toast.success("Status berhasil ditambahkan.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menambahkan status. Coba lagi.")),
  });
}

export function useUpdateWorkflowStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateWorkflowStatusInput }) =>
      apiClient.patch<WorkflowStatusRow>(`/api/workflow-status/${id}`, input),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["workflow-status-admin", row.entity] });
      qc.invalidateQueries({ queryKey: ["workflow-status", row.entity] });
      toast.success("Status berhasil diperbarui.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal memperbarui status. Coba lagi.")),
  });
}

export function useDeleteWorkflowStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: string; entity: WorkflowStatusEntityAdmin }) => apiClient.delete(`/api/workflow-status/${id}`),
    onSuccess: (_data, { entity }) => {
      qc.invalidateQueries({ queryKey: ["workflow-status-admin", entity] });
      qc.invalidateQueries({ queryKey: ["workflow-status", entity] });
      toast.success("Status berhasil dihapus.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menghapus status. Coba lagi.")),
  });
}

export function useMoveWorkflowStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, direction }: { id: string; direction: "up" | "down"; entity: WorkflowStatusEntityAdmin }) =>
      apiClient.post<WorkflowStatusRow[]>(`/api/workflow-status/${id}/pindah`, { direction }),
    onSuccess: (_data, { entity }) => {
      qc.invalidateQueries({ queryKey: ["workflow-status-admin", entity] });
      qc.invalidateQueries({ queryKey: ["workflow-status", entity] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal memindahkan status.")),
  });
}
