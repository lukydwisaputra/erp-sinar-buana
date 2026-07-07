"use client";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { TaxEntry } from "@/lib/schemas/tax-entries";

/** Read-only — rows are produced by Faktur's LUNAS automation; manual entry,
 * settlement workflow, and Tax Center config are out of scope this pass, see
 * the Faktur plan. Query key stays "tax-entries" — query/faktur.ts's
 * useUpdateTermin already invalidates it when a termin is marked Lunas/Batal. */
export function useTaxEntryList() {
  return useQuery({
    queryKey: ["tax-entries"],
    queryFn: () => apiClient.get<TaxEntry[]>("/api/tax-entries"),
  });
}
