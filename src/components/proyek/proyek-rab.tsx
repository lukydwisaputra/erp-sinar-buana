"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { RabEditor, type Rab } from "@/components/shared/rab-jadwal-editor";
import { useProjectRab, useUpdateProjectRab } from "@/lib/query/proyek";
import type { ProyekRab } from "@/lib/schemas/proyek";

/**
 * Estimasi RAB — Admin/Keuangan only (view_project_cost, PRD Bab 6.8). A
 * one-time copy of the SPH's RAB per service item (project_rab_estimates/
 * project_rab_items), fully editable here via the same RabEditor the SPH
 * item editor uses — saving here never changes the source SPH document.
 */
export function ProyekRab({ proyekId }: { proyekId: string }) {
  const { data: estimates = [], isLoading } = useProjectRab(proyekId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat Estimasi RAB…</p>;
  if (estimates.length === 0) return <p className="text-sm text-muted-foreground">Belum ada Estimasi RAB untuk proyek ini.</p>;

  return (
    <div className="space-y-6">
      {estimates.map((estimate) => (
        <ProyekRabCard key={estimate.estimateId} proyekId={proyekId} estimate={estimate} />
      ))}
    </div>
  );
}

function ProyekRabCard({ proyekId, estimate }: { proyekId: string; estimate: ProyekRab }) {
  const [rab, setRab] = React.useState<Rab>({ personil: estimate.personil, langsung: estimate.langsung });
  const { mutate: save, isPending } = useUpdateProjectRab();

  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">{estimate.layananNama ?? "Estimasi RAB"}</h4>
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() => save({ proyekId, estimateId: estimate.estimateId, input: rab })}
        >
          {isPending ? "Menyimpan…" : "Simpan"}
        </Button>
      </div>
      <RabEditor rab={rab} onChange={setRab} />
    </div>
  );
}
