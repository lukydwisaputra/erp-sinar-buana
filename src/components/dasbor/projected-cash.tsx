"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import type { ForecastView } from "@/lib/dasbor/types";

interface ProjectedCashProps {
  forecastView: ForecastView | undefined;
  isLoading: boolean;
}

export function ProjectedCash({ forecastView, isLoading }: ProjectedCashProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Proyeksi Kas (90 Hari)</span>
          {forecastView?.runwayBulan !== undefined && forecastView.runwayBulan !== null && (
            <span className="font-normal text-muted-foreground text-xs">
              Runway: <strong className="text-foreground">{forecastView.runwayBulan} bln</strong>
            </span>
          )}
        </CardTitle>
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
            <div className="text-xs text-muted-foreground mb-2">
              Saldo saat ini: <strong className="text-foreground">{formatRupiahCompact(forecastView.saldoSaatIni)}</strong>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-xs text-muted-foreground">
                    <th className="text-left py-1.5 font-medium">Minggu</th>
                    <th className="text-right py-1.5 font-medium">Saldo Akhir</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {forecastView.weeklyProjections.map((w) => (
                    <tr key={w.weekStart}>
                      <td className="py-1.5">{w.weekStart}</td>
                      <td className={`py-1.5 text-right tabular-nums ${w.saldoAkhir < 0 ? "text-destructive" : ""}`}>
                        {formatRupiah(w.saldoAkhir)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
