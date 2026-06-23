"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <Card size="sm">
      <CardHeader>
        <CardTitle>Profitabilitas Proyek</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : proyek.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Belum ada proyek.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proyek</TableHead>
                <TableHead className="text-right">Kontrak</TableHead>
                <TableHead className="text-right">RAB</TableHead>
                <TableHead className="text-right">Realisasi</TableHead>
                <TableHead className="text-right">Margin Aktual</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proyek.map((p) => {
                const h = HEALTH[p.kesehatan];
                return (
                  <TableRow key={p.proyekId}>
                    <TableCell className="font-medium">{p.proyekNama}</TableCell>
                    <TableCell className="text-right tabular-nums font-mono">{formatRupiahCompact(p.nilaiKontrak)}</TableCell>
                    <TableCell className="text-right tabular-nums font-mono">{formatRupiahCompact(p.rabRencana)}</TableCell>
                    <TableCell className="text-right tabular-nums font-mono">
                      {p.realisasi !== null ? formatRupiahCompact(p.realisasi) : <span className="text-muted-foreground">–</span>}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-mono">
                      {p.marginAktual !== null
                        ? <span className={p.marginAktual < 0 ? "text-destructive" : ""}>{formatRupiahCompact(p.marginAktual)}</span>
                        : <span className="text-muted-foreground">–</span>}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={h.variant}>{h.label}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
