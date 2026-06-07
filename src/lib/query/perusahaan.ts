"use client";
import { useQuery } from "@tanstack/react-query";
import { listPerusahaan, type ListPerusahaanParams } from "@/lib/data/perusahaan";

export function usePerusahaanList(params: ListPerusahaanParams = {}) {
  return useQuery({
    queryKey: ["perusahaan", params],
    queryFn: () => listPerusahaan(params),
  });
}
