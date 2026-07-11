"use client";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MaskedValue } from "@/components/shared/masked-value";
import { formatRupiah } from "@/lib/format";
import type { MonthlySummary } from "@/lib/dasbor/cashflow-summary";

interface CashflowSummaryCardsProps {
  summary: MonthlySummary | undefined;
  isLoading: boolean;
}

function StatCard({ label, value }: { label: string; value: string | undefined }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="text-xs tracking-wide uppercase">{label}</CardDescription>
      </CardHeader>
      <CardContent>
        {value === undefined ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <p className="font-mono text-2xl font-semibold tabular-nums text-foreground"><MaskedValue>{value}</MaskedValue></p>
        )}
      </CardContent>
    </Card>
  );
}

/** FR-09.1 — Ringkasan Keuangan Bulanan. */
export function CashflowSummaryCards({ summary, isLoading }: CashflowSummaryCardsProps) {
  const s = isLoading ? undefined : summary;
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatCard label="Total Pemasukan" value={s ? formatRupiah(s.totalPemasukan) : undefined} />
      <StatCard label="Total Pengeluaran" value={s ? formatRupiah(s.totalPengeluaran) : undefined} />
      <StatCard label="Saldo Akhir" value={s ? formatRupiah(s.saldoAkhir) : undefined} />
    </div>
  );
}
