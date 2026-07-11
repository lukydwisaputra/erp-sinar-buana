"use client";
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
  ChartLegend, ChartLegendContent, type ChartConfig,
} from "@/components/ui/chart";
import { MaskedValue } from "@/components/shared/masked-value";
import { formatRupiah } from "@/lib/format";
import type { TrendPoint } from "@/lib/dasbor/trend";

const trendChartConfig = {
  pendapatan: { label: "Pendapatan", color: "var(--chart-1)" },
  laba: { label: "Laba Bersih", color: "var(--chart-2)" },
  kas: { label: "Kas", color: "var(--chart-3)" },
} satisfies ChartConfig;

function jutaFmt(v: number) {
  const juta = v / 1_000_000;
  return juta % 1 === 0 ? String(juta) : juta.toFixed(1);
}

function bulanLabel(bulan: string) {
  const [y, m] = bulan.split("-").map(Number);
  return new Date(y, m - 1).toLocaleDateString("id-ID", { month: "short", year: "2-digit" });
}

interface TrendLineChartProps {
  points: TrendPoint[];
}

/** FR-09.12 — MoM trend lines (Pendapatan/Laba/Kas), matching arus-kas/page.tsx's chart conventions. */
export function TrendLineChart({ points }: TrendLineChartProps) {
  const data = points.map((p) => ({ ...p, bulan: bulanLabel(p.bulan) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tren Bulanan</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={trendChartConfig} className="h-52 w-full text-sm">
          <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
            <XAxis dataKey="bulan" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={jutaFmt} tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={40} />
            <ChartTooltip
              content={<ChartTooltipContent formatter={(value) => <MaskedValue>{typeof value === "number" ? formatRupiah(value) : String(value)}</MaskedValue>} />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Line type="monotone" dataKey="pendapatan" stroke="var(--color-pendapatan)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="laba" stroke="var(--color-laba)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            <Line type="monotone" dataKey="kas" stroke="var(--color-kas)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          </LineChart>
        </ChartContainer>
        <p className="mt-1 text-center text-xs text-muted-foreground">Nilai dalam juta rupiah (Rp juta)</p>
      </CardContent>
    </Card>
  );
}
