"use client";
import { useQuery } from "@tanstack/react-query";
import { listKatalog, type ListKatalogParams } from "@/lib/data/katalog";

export function useKatalogList(params: ListKatalogParams = {}) {
  return useQuery({ queryKey: ["katalog", params], queryFn: () => listKatalog(params) });
}
