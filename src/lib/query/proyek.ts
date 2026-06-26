"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listProyek, getProyek, createProyek, updateProyekStatus,
  updateMilestone, moveMilestone, addMilestone, deleteMilestone, deleteProyekBySph,
  listProyekLog, listMilestoneLog, listMilestoneComments, addMilestoneComment, logMilestoneActivity,
  type ListProyekParams, type ProyekCreateInput, type MilestoneAttachment,
} from "@/lib/data/proyek";
import type { Milestone, Proyek, ProyekStatus } from "@/lib/schemas/proyek";

export function useProyekList(params: ListProyekParams = {}) {
  return useQuery({ queryKey: ["proyek", params], queryFn: () => listProyek(params) });
}

export function useProyek(id: string, initialData?: Proyek) {
  return useQuery({
    queryKey: ["proyek", id],
    queryFn: () => getProyek(id),
    ...(initialData ? { initialData } : {}),
  });
}

export function useProyekLog(id: string) {
  return useQuery({ queryKey: ["proyek-log", id], queryFn: () => listProyekLog(id) });
}

export function useMilestoneLog(proyekId: string, milestoneId: string) {
  return useQuery({
    queryKey: ["milestone-log", proyekId, milestoneId],
    queryFn: () => listMilestoneLog(proyekId, milestoneId),
  });
}

export function useMilestoneComments(proyekId: string, milestoneId: string) {
  return useQuery({
    queryKey: ["milestone-comments", proyekId, milestoneId],
    queryFn: () => listMilestoneComments(proyekId, milestoneId),
  });
}

export function useCreateProyek() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProyekCreateInput) => createProyek(input),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["proyek"] }); },
    onError: () => { toast.error("Gagal membuat proyek. Coba lagi."); },
  });
}

export function useUpdateProyekStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ProyekStatus }) =>
      updateProyekStatus(id, status),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["proyek", id] });
      qc.invalidateQueries({ queryKey: ["proyek"] });
      qc.invalidateQueries({ queryKey: ["proyek-log", id] });
    },
    onError: () => { toast.error("Gagal mengubah status proyek. Coba lagi."); },
  });
}

export function useUpdateMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, milestoneId, patch }: {
      proyekId: string;
      milestoneId: string;
      patch: Partial<Omit<Milestone, "id" | "urutan">>;
    }) => updateMilestone(proyekId, milestoneId, patch),
    onSuccess: (_, { proyekId, milestoneId }) => {
      qc.invalidateQueries({ queryKey: ["proyek", proyekId] });
      qc.invalidateQueries({ queryKey: ["milestone-log", proyekId, milestoneId] });
    },
    onError: () => { toast.error("Gagal menyimpan perubahan milestone. Coba lagi."); },
  });
}

export function useMoveMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, milestoneId, direction }: {
      proyekId: string;
      milestoneId: string;
      direction: "up" | "down";
    }) => moveMilestone(proyekId, milestoneId, direction),
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["proyek", proyekId] });
    },
    onError: () => { toast.error("Gagal mengubah urutan milestone. Coba lagi."); },
  });
}

export function useAddMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, milestone }: { proyekId: string; milestone: Milestone }) =>
      addMilestone(proyekId, milestone),
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["proyek", proyekId] });
    },
    onError: () => { toast.error("Gagal menambah milestone. Coba lagi."); },
  });
}

export function useDeleteMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, milestoneId }: { proyekId: string; milestoneId: string }) =>
      deleteMilestone(proyekId, milestoneId),
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["proyek", proyekId] });
    },
    onError: () => { toast.error("Gagal menghapus milestone. Coba lagi."); },
  });
}

export function useLogMilestoneActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, milestoneId, message }: {
      proyekId: string; milestoneId: string; message: string;
    }) => logMilestoneActivity(proyekId, milestoneId, message),
    onSuccess: (_, { proyekId, milestoneId }) => {
      qc.invalidateQueries({ queryKey: ["milestone-log", proyekId, milestoneId] });
    },
  });
}

export function useDeleteProyekBySph() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sphId: string) => deleteProyekBySph(sphId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["proyek"] }); },
    onError: () => { toast.error("Gagal menghapus proyek terkait. Coba lagi."); },
  });
}

export function useAddMilestoneComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      proyekId, milestoneId, input,
    }: {
      proyekId: string;
      milestoneId: string;
      input: { author: string; content: string; attachments: MilestoneAttachment[] };
    }) => addMilestoneComment(proyekId, milestoneId, input),
    onSuccess: (_, { proyekId, milestoneId }) => {
      qc.invalidateQueries({ queryKey: ["milestone-comments", proyekId, milestoneId] });
      qc.invalidateQueries({ queryKey: ["milestone-log", proyekId, milestoneId] });
    },
    onError: () => { toast.error("Gagal mengirim komentar. Coba lagi."); },
  });
}
