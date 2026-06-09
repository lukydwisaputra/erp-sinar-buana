"use client";
import { useQuery } from "@tanstack/react-query";
import { listFaktur } from "@/lib/data/faktur";

export function useFakturList(q?: string) {
  return useQuery({ queryKey: ["faktur", { q }], queryFn: () => listFaktur({ q }) });
}
