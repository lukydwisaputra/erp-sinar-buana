"use client";
import { useState, useMemo } from "react";
import { LayoutDashboard } from "lucide-react";
import { useProfitabilitas } from "@/lib/query/dasbor";
import { useForekast } from "@/lib/query/dasbor";
import { useAlerts } from "@/lib/query/dasbor";
import { useFakturList } from "@/lib/query/faktur";
import { useKewajibanPajakList } from "@/lib/query/kewajiban-pajak";
import { computeFaktur } from "@/lib/faktur";
import { periodePreset } from "@/lib/dasbor/periode-utils";
import { PeriodPicker } from "@/components/dasbor/period-picker";
import { KpiStrip } from "@/components/dasbor/kpi-strip";
import { NeedsAttention } from "@/components/dasbor/needs-attention";
import { PlWaterfall } from "@/components/dasbor/pl-waterfall";
import { ProjectedCash } from "@/components/dasbor/projected-cash";
import { ProyekProfitability } from "@/components/dasbor/proyek-profitability";
import type { Periode } from "@/lib/dasbor/types";

export default function DasborPage() {
  const [periode, setPeriode] = useState<Periode>(() => periodePreset("mtd"));

  const { data: profitabilitas, isLoading: plLoading } = useProfitabilitas(periode);
  const { data: forecastView, isLoading: forecastLoading } = useForekast(90);
  const { data: alerts = [], isLoading: alertsLoading } = useAlerts();
  const { data: fakturs = [] } = useFakturList();
  const { data: kewajiban = [] } = useKewajibanPajakList();

  const arOutstanding = useMemo(
    () =>
      fakturs
        .filter((f) => f.status === "terkirim")
        .reduce((s, f) => s + computeFaktur(f).nilaiTermin, 0),
    [fakturs],
  );

  const taxDue = useMemo(
    () =>
      kewajiban
        .filter((k) => k.status === "belum_setor")
        .reduce((s, k) => s + k.jumlah, 0),
    [kewajiban],
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="size-5 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Dasbor</h1>
        </div>
        <PeriodPicker value={periode} onChange={setPeriode} />
      </div>

      {/* KPI Strip */}
      <KpiStrip
        labaRugi={profitabilitas?.labaRugi}
        forecastView={forecastView}
        arOutstanding={arOutstanding}
        taxDue={taxDue}
      />

      {/* Needs Attention */}
      <NeedsAttention alerts={alerts} isLoading={alertsLoading} />

      {/* P&L + Projected Cash */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PlWaterfall labaRugi={profitabilitas?.labaRugi} isLoading={plLoading} />
        <ProjectedCash forecastView={forecastView} isLoading={forecastLoading} />
      </div>

      {/* Per-Project Profitability */}
      <ProyekProfitability
        proyek={profitabilitas?.proyek ?? []}
        isLoading={plLoading}
      />
    </div>
  );
}
