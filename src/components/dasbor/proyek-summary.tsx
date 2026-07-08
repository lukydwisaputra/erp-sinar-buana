"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProyekSummary, CountRow } from "@/lib/dasbor/proyek-summary";

function Breakdown({ title, rows }: { title: string; rows: CountRow[] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">—</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{r.label}</span>
              <span className="shrink-0 font-mono font-medium">{r.count}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

interface ProyekSummaryPanelProps {
  summary: ProyekSummary | undefined;
  isLoading: boolean;
}

/** FR-09.4 — Ringkasan Proyek. Rendered for all roles (Tim Teknis sees only assigned projects, via rbac-view.ts). */
export function ProyekSummaryPanel({ summary, isLoading }: ProyekSummaryPanelProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Ringkasan Proyek</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !summary ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Total Proyek</p>
              <p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{summary.total}</p>
            </div>
            <Breakdown title="Berdasarkan Status" rows={summary.byStatus} />
            <Breakdown title="Berdasarkan Area" rows={summary.byArea} />
            <Breakdown title="Berdasarkan Layanan" rows={summary.byLayanan} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
