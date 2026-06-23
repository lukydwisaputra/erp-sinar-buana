"use client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiahCompact } from "@/lib/format";
import type { LabaRugi, ForecastView } from "@/lib/dasbor/types";

interface KpiStripProps {
  labaRugi: LabaRugi | undefined;
  forecastView: ForecastView | undefined;
  arOutstanding: number;
  taxDue: number;
}

function KpiCard({ label, value, sub }: { label: string; value: string | undefined; sub?: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        {value === undefined ? (
          <Skeleton className="mt-1 h-6 w-24" />
        ) : (
          <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
        )}
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  );
}

export function KpiStrip({ labaRugi, forecastView, arOutstanding, taxDue }: KpiStripProps) {
  const fmt = (n: number | undefined) => n !== undefined ? formatRupiahCompact(n) : undefined;
  const pct = (n: number | undefined) => n !== undefined ? `${n.toFixed(1)}%` : undefined;
  const runway = forecastView?.runwayBulan;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <KpiCard label="Laba Bersih (Est.)" value={fmt(labaRugi?.labaBersih)} sub={pct(labaRugi?.marginBersihPersen) ? `Margin ${pct(labaRugi?.marginBersihPersen)}` : undefined} />
      <KpiCard label="Pendapatan" value={fmt(labaRugi?.pendapatan)} sub={pct(labaRugi?.marginKotorPersen) ? `Margin Kotor ${pct(labaRugi?.marginKotorPersen)}` : undefined} />
      <KpiCard label="Kas Saat Ini" value={fmt(forecastView?.saldoSaatIni)} />
      <KpiCard
        label="Runway"
        value={
          forecastView === undefined
            ? undefined
            : runway === null
            ? "–"
            : `${runway} bln`
        }
        sub="estimasi pembayaran gaji"
      />
      <KpiCard label="AR Terutang" value={fmt(arOutstanding)} sub="faktur belum dibayar" />
      <KpiCard label="Pajak Terutang" value={fmt(taxDue)} sub="belum disetor" />
      <KpiCard label="Laba Kotor" value={fmt(labaRugi?.labaKotor)} />
      <KpiCard label="Laba Operasional" value={fmt(labaRugi?.labaOperasional)} />
    </div>
  );
}
