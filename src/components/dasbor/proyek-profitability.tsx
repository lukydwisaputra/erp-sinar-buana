"use client";
import React from "react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { formatRupiahCompact } from "@/lib/format";
import type { ProyekProfit, KesehatanProyek } from "@/lib/dasbor/types";

const PAGE_SIZE = 10;

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
  const [open, setOpen] = React.useState(true);
  const [page, setPage] = React.useState(0);
  const totalPages = Math.ceil(proyek.length / PAGE_SIZE);
  const paged = proyek.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Profitabilitas Proyek</CardTitle>
        <CardAction>
          <Button variant="ghost" size="icon" className="size-6" onClick={() => setOpen((o) => !o)}>
            <ChevronDownIcon className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </Button>
        </CardAction>
      </CardHeader>
      {open && <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : proyek.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Belum ada proyek.</p>
        ) : (
          <>
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
                {paged.map((p) => {
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
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, proyek.length)} dari {proyek.length}</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => setPage((p) => p - 1)} disabled={page === 0}>
                    <ChevronLeftIcon className="size-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages - 1}>
                    <ChevronRightIcon className="size-3" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>}
    </Card>
  );
}
