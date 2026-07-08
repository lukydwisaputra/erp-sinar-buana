"use client";
import Link from "next/link";
import { Pie, PieChart, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { formatRupiah } from "@/lib/format";
import type { KategoriSlice } from "@/lib/dasbor/cashflow-summary";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"];

function buildConfig(slices: KategoriSlice[]): ChartConfig {
  return Object.fromEntries(
    slices.map((s, i) => [s.kategori, { label: s.kategori, color: COLORS[i % COLORS.length] }]),
  );
}

function CategoryPie({ title, slices }: { title: string; slices: KategoriSlice[] }) {
  const config = buildConfig(slices);
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {slices.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Belum ada transaksi.</p>
        ) : (
          <>
            <ChartContainer config={config} className="mx-auto aspect-square max-h-48">
              <PieChart>
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => (typeof value === "number" ? formatRupiah(value) : String(value))} />} />
                <Pie data={slices} dataKey="jumlah" nameKey="kategori" innerRadius={40} outerRadius={70} strokeWidth={2}>
                  {slices.map((s, i) => (
                    <Cell key={s.kategori} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <ul className="mt-2 space-y-1">
              {slices.map((s, i) => (
                <li key={s.kategori} className="flex items-center justify-between gap-2 text-xs">
                  <Link
                    href={`/arus-kas?kategori=${encodeURIComponent(s.kategori)}`}
                    className="flex min-w-0 items-center gap-1.5 hover:underline"
                  >
                    <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="truncate">{s.kategori}</span>
                  </Link>
                  <span className="shrink-0 font-mono text-muted-foreground">{formatRupiah(s.jumlah)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/** FR-09.2 — category pie charts (income/expense distribution). */
export function CashflowCategoryPie({ pemasukan, pengeluaran }: { pemasukan: KategoriSlice[]; pengeluaran: KategoriSlice[] }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <CategoryPie title="Distribusi Pemasukan" slices={pemasukan} />
      <CategoryPie title="Distribusi Pengeluaran" slices={pengeluaran} />
    </div>
  );
}
