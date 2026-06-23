"use client";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import type { ForecastView } from "@/lib/dasbor/types";

interface ProjectedCashProps {
  forecastView: ForecastView | undefined;
  isLoading: boolean;
}

export function ProjectedCash({ forecastView, isLoading }: ProjectedCashProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Proyeksi Kas (90 Hari)</CardTitle>
        {forecastView?.runwayBulan !== undefined && forecastView.runwayBulan !== null && (
          <CardDescription>
            Runway: <strong className="text-foreground">{forecastView.runwayBulan} bln</strong>
          </CardDescription>
        )}
        {forecastView && (
          <CardAction>
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatRupiahCompact(forecastView.saldoSaatIni)}
            </span>
          </CardAction>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-7 w-full" />)}
          </div>
        ) : !forecastView || forecastView.weeklyProjections.length === 0 ? (
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
                {forecastView.weeklyProjections.map((w) => (
                  <TableRow key={w.weekStart}>
                    <TableCell>{w.weekStart}</TableCell>
                    <TableCell className={`text-right tabular-nums font-mono ${w.saldoAkhir < 0 ? "text-destructive" : ""}`}>
                      {formatRupiah(w.saldoAkhir)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {forecastView.entries.length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  {forecastView.entries.length} transaksi terjadwal
                </summary>
                <div className="mt-2 space-y-1">
                  {forecastView.entries.map((e) => (
                    <div key={`${e.sumber}-${e.refId}-${e.tanggal}`} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{e.tanggal} · {e.label}</span>
                      <span className={e.jenis === "masuk" ? "text-green-600" : "text-red-600"}>
                        {e.jenis === "masuk" ? "+" : "−"}{formatRupiahCompact(e.jumlah)}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
