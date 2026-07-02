"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listStatusDefinisi, createStatusDefinisi, updateStatusLabel, setStatusRole, deleteStatusDefinisi,
} from "@/lib/data/status-definisi";
import type { DocTypeStatus, SystemRole } from "@/lib/schemas/status-definisi";

export function useStatusDefinisiList(docType: DocTypeStatus) {
  return useQuery({ queryKey: ["status-definisi", docType], queryFn: () => listStatusDefinisi(docType) });
}

function invalidate(qc: ReturnType<typeof useQueryClient>, docType: DocTypeStatus) {
  qc.invalidateQueries({ queryKey: ["status-definisi", docType] });
}

export function useCreateStatusDefinisi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ docType, label }: { docType: DocTypeStatus; label: string }) => createStatusDefinisi(docType, label),
    onSuccess: (_data, variables) => { invalidate(qc, variables.docType); toast.success("Status ditambahkan."); },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menambahkan status."),
  });
}

export function useUpdateStatusLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, docType, label }: { id: string; docType: DocTypeStatus; label: string }) => updateStatusLabel(id, docType, label),
    onSuccess: (_data, variables) => { invalidate(qc, variables.docType); toast.success("Label status diperbarui."); },
    onError: () => toast.error("Gagal memperbarui label status."),
  });
}

export function useSetStatusRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, docType, role }: { id: string; docType: DocTypeStatus; role: SystemRole | null }) => setStatusRole(id, docType, role),
    onSuccess: (_data, variables) => { invalidate(qc, variables.docType); toast.success("Peran sistem diperbarui."); },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal memperbarui peran sistem."),
  });
}

export function useDeleteStatusDefinisi() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, docType }: { id: string; docType: DocTypeStatus }) => deleteStatusDefinisi(id, docType),
    onSuccess: (_data, variables) => { invalidate(qc, variables.docType); toast.success("Status dihapus."); },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Gagal menghapus status."),
  });
}
