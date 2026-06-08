"use client";
import { useQuery } from "@tanstack/react-query";
import { listPenawaran, type ListPenawaranParams } from "@/lib/data/penawaran";

export function usePenawaranList(params: ListPenawaranParams = {}) {
  return useQuery({ queryKey: ["penawaran", params], queryFn: () => listPenawaran(params) });
}
