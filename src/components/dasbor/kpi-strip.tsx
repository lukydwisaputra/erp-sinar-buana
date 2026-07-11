"use client";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MaskedValue } from "@/components/shared/masked-value";
import { formatRupiahCompact } from "@/lib/format";
import type { LabaRugi, ForecastView } from "@/lib/dasbor/types";

interface KpiStripProps {
  labaRugi: LabaRugi | undefined;
  forecastView: ForecastView | undefined;
  arOutstanding: number;
  taxDue: number;
}

function KpiCard({ label, value, sub, sensitive = true }: { label: string; value: string | undefined; sub?: string; sensitive?: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="text-xs tracking-wide uppercase">{label}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {value === undefined ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">
            {sensitive ? <MaskedValue>{value}</MaskedValue> : value}
          </p>
        )}
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
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
        sensitive={false}
      />
      <KpiCard label="AR Terutang" value={fmt(arOutstanding)} sub="faktur belum dibayar" />
      <KpiCard label="Pajak Terutang" value={fmt(taxDue)} sub="belum disetor" />
      <KpiCard label="Laba Kotor" value={fmt(labaRugi?.labaKotor)} />
      <KpiCard label="Laba Operasional" value={fmt(labaRugi?.labaOperasional)} />
    </div>
  );
}
