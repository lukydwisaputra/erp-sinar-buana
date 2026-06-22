"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  listRealisasiRab,
  listRealisasiRabByProyek,
  createRealisasiRab,
  removeRealisasiRab,
} from "@/lib/data/realisasi-rab";
import type { RealisasiRabFormValues } from "@/lib/schemas/realisasi-rab";

export function useRealisasiRabList() {
  return useQuery({ queryKey: ["realisasi-rab"], queryFn: listRealisasiRab });
}

export function useRealisasiRabByProyek(proyekId: string) {
  return useQuery({
    queryKey: ["realisasi-rab", proyekId],
    queryFn: () => listRealisasiRabByProyek(proyekId),
    enabled: !!proyekId,
  });
}

export function useCreateRealisasiRab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RealisasiRabFormValues) => createRealisasiRab(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["realisasi-rab"] });
      toast.success("Realisasi RAB berhasil dicatat.");
    },
    onError: () => {
      toast.error("Gagal mencatat realisasi RAB. Coba lagi.");
    },
  });
}

export function useRemoveRealisasiRab() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => removeRealisasiRab(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["realisasi-rab"] });
      toast.success("Realisasi RAB berhasil dihapus.");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Gagal menghapus realisasi RAB.");
    },
  });
}
