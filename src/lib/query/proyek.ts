"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient, apiErrorMessage } from "@/lib/api-client";
import type {
  Proyek,
  ProyekLogEntry,
  ProyekComment,
  ProyekJadwal,
  CreateProyekInput,
  CreateMilestoneInput,
  UpdateMilestoneInput,
  AddCommentInput,
} from "@/lib/schemas/proyek";

export type ListProyekParams = { sphId?: string };

export function useProyekList(params: ListProyekParams = {}) {
  const qs = params.sphId ? `?sphId=${encodeURIComponent(params.sphId)}` : "";
  return useQuery({
    queryKey: ["proyek", params],
    queryFn: () => apiClient.get<Proyek[]>(`/api/proyek${qs}`),
  });
}

export function useProyek(id: string, initialData?: Proyek) {
  return useQuery({
    queryKey: ["proyek", id],
    queryFn: () => apiClient.get<Proyek>(`/api/proyek/${id}`),
    ...(initialData ? { initialData } : {}),
    enabled: !!id,
  });
}

export function useProyekLog(id: string) {
  return useQuery({
    queryKey: ["proyek-log", id],
    queryFn: () => apiClient.get<ProyekLogEntry[]>(`/api/proyek/${id}/log`),
    enabled: !!id,
  });
}

export function useMilestoneComments(proyekId: string, milestoneId: string) {
  return useQuery({
    queryKey: ["milestone-comments", proyekId, milestoneId],
    queryFn: () => apiClient.get<ProyekComment[]>(`/api/proyek/${proyekId}/comments?milestoneId=${milestoneId}`),
    enabled: !!proyekId && !!milestoneId,
  });
}

export function useAddMilestoneComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, milestoneId, input }: { proyekId: string; milestoneId: string; input: AddCommentInput }) =>
      apiClient.post<ProyekComment>(`/api/proyek/${proyekId}/comments?milestoneId=${milestoneId}`, input),
    onSuccess: (_, { proyekId, milestoneId }) => {
      qc.invalidateQueries({ queryKey: ["milestone-comments", proyekId, milestoneId] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal mengirim komentar.")),
  });
}

export function useCreateProyek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProyekInput) => apiClient.post<Proyek>("/api/proyek", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyek"] });
      toast.success("Proyek berhasil dibuat.");
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal membuat proyek.")),
  });
}

export function useUpdateProyekStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, statusId }: { id: string; statusId: string }) =>
      apiClient.patch<Proyek>(`/api/proyek/${id}`, { statusId }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["proyek", id] });
      qc.invalidateQueries({ queryKey: ["proyek"] });
      qc.invalidateQueries({ queryKey: ["proyek-log", id] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal mengubah status proyek.")),
  });
}

export function useAddMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, input }: { proyekId: string; input: CreateMilestoneInput }) =>
      apiClient.post<Proyek>(`/api/proyek/${proyekId}/milestones`, input),
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["proyek", proyekId] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menambah milestone.")),
  });
}

export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, milestoneId, patch }: { proyekId: string; milestoneId: string; patch: UpdateMilestoneInput }) =>
      apiClient.patch<Proyek>(`/api/proyek/${proyekId}/milestones/${milestoneId}`, patch),
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["proyek", proyekId] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menyimpan perubahan milestone.")),
  });
}

export function useMoveMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, milestoneId, direction }: { proyekId: string; milestoneId: string; direction: "up" | "down" }) =>
      apiClient.post<Proyek>(`/api/proyek/${proyekId}/milestones/${milestoneId}/move`, { direction }),
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["proyek", proyekId] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal mengubah urutan milestone.")),
  });
}

export function useDeleteMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, milestoneId }: { proyekId: string; milestoneId: string }) =>
      apiClient.delete<Proyek>(`/api/proyek/${proyekId}/milestones/${milestoneId}`),
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["proyek", proyekId] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menghapus milestone.")),
  });
}

export function useDeleteProyekBySph() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sphId: string) => apiClient.post("/api/proyek/delete-by-sph", { sphId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyek"] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menghapus proyek terkait.")),
  });
}

// ── Gantt / Estimasi Jadwal (proyek-side) ────────────────────────────────────

export function useProjectSchedules(proyekId: string) {
  return useQuery({
    queryKey: ["proyek-jadwal", proyekId],
    queryFn: () => apiClient.get<ProyekJadwal[]>(`/api/proyek/${proyekId}/jadwal`),
    enabled: !!proyekId,
  });
}

export function useToggleActualWeek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, rowId, weekNumber }: { proyekId: string; rowId: string; weekNumber: number }) =>
      apiClient.post<ProyekJadwal[]>(`/api/proyek/${proyekId}/jadwal/mark`, { rowId, weekNumber }),
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["proyek-jadwal", proyekId] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal memperbarui progres jadwal.")),
  });
}

export function useAddScheduleRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, scheduleId, activityName }: { proyekId: string; scheduleId?: string; activityName: string }) =>
      apiClient.post<ProyekJadwal[]>(`/api/proyek/${proyekId}/jadwal`, { scheduleId, activityName }),
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["proyek-jadwal", proyekId] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menambah baris jadwal.")),
  });
}

export function useRemoveScheduleRow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, rowId }: { proyekId: string; rowId: string }) =>
      apiClient.delete<ProyekJadwal[]>(`/api/proyek/${proyekId}/jadwal/rows/${rowId}`),
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["proyek-jadwal", proyekId] });
    },
    onError: (error) => toast.error(apiErrorMessage(error, "Gagal menghapus baris jadwal.")),
  });
}

// ── Workflow status (shared, config-driven) ─────────────────────────────────

export type WorkflowStatusOption = { id: string; label: string; color: string | null; systemRole: string | null };

export function useWorkflowStatuses(entity: "proyek" | "milestone" | "faktur" | "penggajian") {
  return useQuery({
    queryKey: ["workflow-status", entity],
    queryFn: () => apiClient.get<WorkflowStatusOption[]>(`/api/workflow-status?entity=${entity}`),
  });
}

/** Plain async function (not a hook) — called directly from query/faktur.ts's
 * mutationFn, mirroring the mock's `cancelProyekBySph` composability. */
export async function cancelProyekBySph(sphId: string): Promise<void> {
  await apiClient.post("/api/proyek/cancel-by-sph", { sphId });
}
