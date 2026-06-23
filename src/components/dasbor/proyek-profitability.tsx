"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiahCompact } from "@/lib/format";
import type { ProyekProfit, KesehatanProyek } from "@/lib/dasbor/types";

interface ProyekProfitabilityProps {
  proyek: ProyekProfit[];
  isLoading: boolean;
}

const HEALTH: Record<KesehatanProyek, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  hijau:  { label: "On Track",       variant: "success" },
  kuning: { label: "Waspada",        variant: "warning" },
  merah:  { label: "Over Budget",    variant: "destructive" },
  abu:    { label: "Belum Ada Data", variant: "secondary" },
};

export function ProyekProfitability({ proyek, isLoading }: ProyekProfitabilityProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Profitabilitas Proyek</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : proyek.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Belum ada proyek.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-1.5 font-medium">Proyek</th>
                  <th className="text-right py-1.5 font-medium">Kontrak</th>
                  <th className="text-right py-1.5 font-medium">RAB</th>
                  <th className="text-right py-1.5 font-medium">Realisasi</th>
                  <th className="text-right py-1.5 font-medium">Margin Aktual</th>
                  <th className="text-center py-1.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {proyek.map((p) => {
                  const h = HEALTH[p.kesehatan];
                  return (
                    <tr key={p.proyekId}>
                      <td className="py-2 font-medium">{p.proyekNama}</td>
                      <td className="py-2 text-right tabular-nums">{formatRupiahCompact(p.nilaiKontrak)}</td>
                      <td className="py-2 text-right tabular-nums">{formatRupiahCompact(p.rabRencana)}</td>
                      <td className="py-2 text-right tabular-nums">
                        {p.realisasi !== null ? formatRupiahCompact(p.realisasi) : <span className="text-muted-foreground">–</span>}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {p.marginAktual !== null
                          ? <span className={p.marginAktual < 0 ? "text-destructive" : ""}>{formatRupiahCompact(p.marginAktual)}</span>
                          : <span className="text-muted-foreground">–</span>}
                      </td>
                      <td className="py-2 text-center">
                        <Badge variant={h.variant} className="text-[10px]">{h.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
