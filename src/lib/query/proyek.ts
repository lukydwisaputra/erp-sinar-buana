"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listProyek, getProyek, createProyek, updateProyekStatus,
  updateMilestone, moveMilestone, addMilestone, deleteMilestone,
  listProyekLog, replaceMilestonesWithTemplate,
  type ListProyekParams, type ProyekCreateInput,
} from "@/lib/data/proyek";
import type { Milestone, ProyekStatus } from "@/lib/schemas/proyek";

export function useProyekList(params: ListProyekParams = {}) {
  return useQuery({ queryKey: ["proyek", params], queryFn: () => listProyek(params) });
}

export function useProyek(id: string) {
  return useQuery({ queryKey: ["proyek", id], queryFn: () => getProyek(id) });
}

export function useProyekLog(id: string) {
  return useQuery({ queryKey: ["proyek-log", id], queryFn: () => listProyekLog(id) });
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
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["proyek", proyekId] });
      qc.invalidateQueries({ queryKey: ["proyek-log", proyekId] });
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

export function useReplaceMilestonesWithTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ proyekId, templateMilestones }: {
      proyekId: string;
      templateMilestones: Omit<Milestone, "id" | "urutan">[];
    }) => replaceMilestonesWithTemplate(proyekId, templateMilestones),
    onSuccess: (_, { proyekId }) => {
      qc.invalidateQueries({ queryKey: ["proyek", proyekId] });
      qc.invalidateQueries({ queryKey: ["proyek-log", proyekId] });
    },
    onError: () => { toast.error("Gagal memuat template. Coba lagi."); },
  });
}
