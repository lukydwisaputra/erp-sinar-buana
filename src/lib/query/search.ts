"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { SearchResult } from "@/lib/search/service";

export function useGlobalSearch(query: string) {
  const q = query.trim();
  return useQuery({
    queryKey: ["global-search", q],
    queryFn: () => apiClient.get<SearchResult[]>(`/api/search?q=${encodeURIComponent(q)}`),
    enabled: q.length >= 2,
  });
}
