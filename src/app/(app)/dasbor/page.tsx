"use client";
import { useState, useMemo } from "react";
import { LayoutDashboard } from "lucide-react";
import { useSession } from "@/lib/query/session";
import { isFinance as checkFinanceAccess } from "@/lib/auth/rbac";
import { useProfitabilitas, useForekast, useAlerts, useProyekSummary } from "@/lib/query/dasbor";
import { useFakturList } from "@/lib/query/faktur";
import { useTaxEntryList } from "@/lib/query/tax-entries";
import { useDashboardParams } from "@/lib/query/dashboard-params";
import { periodePreset } from "@/lib/dasbor/periode-utils";
import { computeMonthlySummary, groupByKategori } from "@/lib/dasbor/cashflow-summary";
import { computeTaxSummary } from "@/lib/dasbor/tax-summary";
import { PeriodPicker } from "@/components/dasbor/period-picker";
import { KpiStrip } from "@/components/dasbor/kpi-strip";
import { NeedsAttention } from "@/components/dasbor/needs-attention";
import { PlWaterfall } from "@/components/dasbor/pl-waterfall";
import { ProyekProfitability } from "@/components/dasbor/proyek-profitability";
import { CashflowSummaryCards } from "@/components/dasbor/cashflow-summary-cards";
import { CashflowCategoryPie } from "@/components/dasbor/cashflow-category-pie";
import { CashflowTable } from "@/components/dasbor/cashflow-table";
import { ProyekSummaryPanel } from "@/components/dasbor/proyek-summary";
import { TaxSummaryPanel } from "@/components/dasbor/tax-summary-panel";
import { TrendLineChart } from "@/components/dasbor/trend-line-chart";
import type { Periode } from "@/lib/dasbor/types";

export default function DasborPage() {
  const [periode, setPeriode] = useState<Periode>(() => periodePreset("mtd"));
  const { data: session } = useSession();
  const isFinance = checkFinanceAccess(session);

  // Laba-Rugi/Profitabilitas Per-Proyek/Forecast/Tax detail are
  // view_profit/view_project_cost/view_forecast/view_tax_detail territory
  // (PRD Bab 8.7) — `enabled: isFinance` means non-finance sessions never
  // even issue these requests, belt-and-suspenders with each route's own
  // server-side requireFinance 403.
  const { data: profitabilitas, isLoading: plLoading } = useProfitabilitas(periode, isFinance);
  const { data: dashboardParams } = useDashboardParams();
  const { data: forecastView } = useForekast(dashboardParams?.horizonProyeksiHari ?? 90, isFinance);
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts();
  const { data: fakturs = [] } = useFakturList(undefined, isFinance);
  const { data: kewajiban = [] } = useTaxEntryList(isFinance);
  const { data: proyekSummary, isLoading: proyekSummaryLoading } = useProyekSummary();

  const arOutstanding = useMemo(
    () =>
      fakturs
        .flatMap((f) => f.termins)
        .filter((t) => t.statusSystemRole === null)
        .reduce((s, t) => s + t.nilaiTermin, 0),
    [fakturs],
  );

  const taxDue = useMemo(
    () =>
      kewajiban
        .filter((k) => k.settlementStatus !== "sudah_disetor")
        .reduce((s, k) => s + k.jumlah, 0),
    [kewajiban],
  );

  const taxSummary = useMemo(() => {
    if (!isFinance) return undefined;
    return computeTaxSummary(kewajiban, new Date().toISOString().slice(0, 10));
  }, [kewajiban, isFinance]);

  const arusKas = useMemo(() => profitabilitas?.arusKas ?? [], [profitabilitas]);
  const cashflowSummary = useMemo(() => computeMonthlySummary(arusKas, periode), [arusKas, periode]);
  const kategoriPemasukan = useMemo(() => groupByKategori(arusKas, "kredit"), [arusKas]);
  const kategoriPengeluaran = useMemo(() => groupByKategori(arusKas, "debit"), [arusKas]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold tracking-tight">Dasbor</h1>
        </div>
        <PeriodPicker value={periode} onChange={setPeriode} />
      </div>

      {/* KPI Strip — Laba-Rugi/Kas/Runway/Pajak are finance-only (PRD Bab 8.7);
          not rendered for Sales/Tim Teknis/Viewer, not just hidden after fetch. */}
      {isFinance && (
        <KpiStrip
          labaRugi={profitabilitas?.labaRugi}
          forecastView={forecastView}
          arOutstanding={arOutstanding}
          taxDue={taxDue}
        />
      )}

      {/* Needs Attention — all roles; getAlerts already drops finance-only
          alert kinds server-side for non-finance callers. */}
      <NeedsAttention alerts={alerts} isLoading={alertsLoading} />

      {/* Ringkasan Proyek — all roles (Tim Teknis narrowed to assigned projects server-side). */}
      <ProyekSummaryPanel summary={proyekSummary} isLoading={proyekSummaryLoading} />

      {isFinance && (
        <>
          {/* P&L */}
          <PlWaterfall labaRugi={profitabilitas?.labaRugi} isLoading={plLoading} />

          {/* Per-Project Profitability */}
          <ProyekProfitability
            proyek={profitabilitas?.proyek ?? []}
            isLoading={plLoading}
          />

          {/* Ringkasan Keuangan Bulanan */}
          <CashflowSummaryCards summary={cashflowSummary} isLoading={plLoading} />

          {/* Distribusi kategori */}
          <CashflowCategoryPie pemasukan={kategoriPemasukan} pengeluaran={kategoriPengeluaran} />

          {/* Tren bulanan */}
          <TrendLineChart points={profitabilitas?.trend ?? []} />

          {/* Ringkasan Pajak */}
          <TaxSummaryPanel summary={taxSummary} isLoading={plLoading} />

          {/* Riwayat Arus Kas (periode terpilih) */}
          <CashflowTable entries={arusKas} isLoading={plLoading} />
        </>
      )}
    </div>
  );
}
