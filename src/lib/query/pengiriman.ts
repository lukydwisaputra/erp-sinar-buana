"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listPengirimanLog, createPengirimanLog } from "@/lib/data/pengiriman";
import type { PengirimanLog } from "@/lib/schemas/pengiriman";

export function usePengirimanLog() {
  return useQuery({ queryKey: ["pengiriman"], queryFn: listPengirimanLog });
}

export function useCreatePengirimanLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: Omit<PengirimanLog, "id" | "timestamp">) => createPengirimanLog(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pengiriman"] });
    },
  });
}
