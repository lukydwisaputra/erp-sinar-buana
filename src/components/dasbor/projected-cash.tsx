"use client";
import React from "react";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import type { ForecastView } from "@/lib/dasbor/types";

const PAGE_SIZE = 10;

interface ProjectedCashProps {
  forecastView: ForecastView | undefined;
  isLoading: boolean;
}

export function ProjectedCash({ forecastView, isLoading }: ProjectedCashProps) {
  const [open, setOpen] = React.useState(false);
  const [weekPage, setWeekPage] = React.useState(0);
  const [entryPage, setEntryPage] = React.useState(0);

  const weeks = forecastView?.weeklyProjections ?? [];
  const entries = forecastView?.entries ?? [];
  const weekTotalPages = Math.ceil(weeks.length / PAGE_SIZE);
  const entryTotalPages = Math.ceil(entries.length / PAGE_SIZE);
  const pagedWeeks = weeks.slice(weekPage * PAGE_SIZE, (weekPage + 1) * PAGE_SIZE);
  const pagedEntries = entries.slice(entryPage * PAGE_SIZE, (entryPage + 1) * PAGE_SIZE);

  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Proyeksi Kas (90 Hari)</CardTitle>
        {forecastView?.runwayBulan !== undefined && forecastView.runwayBulan !== null && (
          <CardDescription>
            Runway: <strong className="text-foreground">{forecastView.runwayBulan} bln</strong>
          </CardDescription>
        )}
        <CardAction className="flex items-center gap-2">
          {forecastView && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatRupiahCompact(forecastView.saldoSaatIni)}
            </span>
          )}
          <Button variant="ghost" size="icon" className="size-6" onClick={() => setOpen((o) => !o)}>
            <ChevronDownIcon className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </Button>
        </CardAction>
      </CardHeader>
      {open && <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
          </div>
        ) : !forecastView || weeks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Tidak ada data proyeksi.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Minggu</TableHead>
                  <TableHead className="text-right">Saldo Akhir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedWeeks.map((w) => (
                  <TableRow key={w.weekStart}>
                    <TableCell>{w.weekStart}</TableCell>
                    <TableCell className={`text-right tabular-nums font-mono ${w.saldoAkhir < 0 ? "text-destructive" : ""}`}>
                      {formatRupiah(w.saldoAkhir)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {weekTotalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                <span>{weekPage * PAGE_SIZE + 1}–{Math.min((weekPage + 1) * PAGE_SIZE, weeks.length)} dari {weeks.length} minggu</span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => setWeekPage((p) => p - 1)} disabled={weekPage === 0}>
                    <ChevronLeftIcon className="size-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="size-6" onClick={() => setWeekPage((p) => p + 1)} disabled={weekPage >= weekTotalPages - 1}>
                    <ChevronRightIcon className="size-3" />
                  </Button>
                </div>
              </div>
            )}
            {entries.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  {entries.length} transaksi terjadwal
                </summary>
                <div className="mt-2 space-y-1">
                  {pagedEntries.map((e) => (
                    <div key={`${e.sumber}-${e.refId}-${e.tanggal}`} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{e.tanggal} · {e.label}</span>
                      <span className={e.jenis === "masuk" ? "text-green-600" : "text-red-600"}>
                        {e.jenis === "masuk" ? "+" : "−"}{formatRupiahCompact(e.jumlah)}
                      </span>
                    </div>
                  ))}
                </div>
                {entryTotalPages > 1 && (
                  <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                    <span>{entryPage * PAGE_SIZE + 1}–{Math.min((entryPage + 1) * PAGE_SIZE, entries.length)} dari {entries.length}</span>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="size-6" onClick={() => setEntryPage((p) => p - 1)} disabled={entryPage === 0}>
                        <ChevronLeftIcon className="size-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="size-6" onClick={() => setEntryPage((p) => p + 1)} disabled={entryPage >= entryTotalPages - 1}>
                        <ChevronRightIcon className="size-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </details>
            )}
          </>
        )}
      </CardContent>}
    </Card>
  );
}
