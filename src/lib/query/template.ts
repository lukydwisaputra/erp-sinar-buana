"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listTemplates, createTemplate, updateTemplate, deleteTemplate, duplicateTemplate, moveMilestoneStep,
} from "@/lib/data/template";
import type { Template, TemplateJenis } from "@/lib/schemas/template";

export function useTemplateList(jenis?: TemplateJenis) {
  return useQuery({ queryKey: ["template", jenis ?? "all"], queryFn: () => listTemplates(jenis) });
}

function invalidateTemplates(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["template"] });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<Template, "id" | "createdAt">) => createTemplate(input),
    onSuccess: () => { invalidateTemplates(qc); toast.success("Template ditambahkan."); },
    onError: () => toast.error("Gagal menambahkan template."),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<Template, "id" | "createdAt">> }) => updateTemplate(id, patch),
    onSuccess: () => { invalidateTemplates(qc); toast.success("Template diperbarui."); },
    onError: () => toast.error("Gagal memperbarui template."),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => { invalidateTemplates(qc); toast.success("Template dihapus."); },
    onError: () => toast.error("Gagal menghapus template."),
  });
}

export function useDuplicateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, namaBaru }: { id: string; namaBaru: string }) => duplicateTemplate(id, namaBaru),
    onSuccess: () => { invalidateTemplates(qc); toast.success("Template diduplikasi."); },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menduplikasi template."),
  });
}

export function useMoveMilestoneStep() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, index, direction }: { templateId: string; index: number; direction: "up" | "down" }) =>
      moveMilestoneStep(templateId, index, direction),
    onSuccess: () => invalidateTemplates(qc),
    onError: () => toast.error("Gagal mengubah urutan langkah."),
  });
}
