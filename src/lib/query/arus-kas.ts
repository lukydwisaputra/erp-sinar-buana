"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ArusKasEntry } from "@/lib/schemas/arus-kas";

/** Read-only — rows are produced by document triggers (Faktur's LUNAS
 * automation); manual-entry CRUD is out of scope this pass, see the Faktur
 * plan. Query key stays "arus-kas" — query/faktur.ts's useUpdateTermin
 * already invalidates it when a termin is marked Lunas/Batal. */
export function useArusKasList() {
  return useQuery({
    queryKey: ["arus-kas"],
    queryFn: () => apiClient.get<ArusKasEntry[]>("/api/arus-kas"),
  });
}
