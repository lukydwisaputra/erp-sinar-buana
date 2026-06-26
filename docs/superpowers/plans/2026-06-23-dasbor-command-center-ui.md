# Dasbor — Command Center UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the dasbor placeholder with a working Owner Command Center: period picker, KPI strip, Needs Attention feed, P&L Waterfall, Projected Cash, Per-Project Profitability table, and a Realisasi RAB entry form on the Proyek detail page.

**Architecture:** Presentational components in `src/components/dasbor/` and `src/components/realisasi-rab/` consume data from existing query hooks. The dasbor page owns period state and wires hooks to components. No new data engines or schemas — Plan 2 and Plan 3 already provide all computation.

**Tech Stack:** Next.js "use client" pages/components, TypeScript, TanStack Query hooks, Tailwind, shadcn/ui (Badge, Card, Table, Skeleton, Select, Sheet), `@/lib/format` (formatRupiah, formatRupiahCompact), sonner toasts.

## Global Constraints

- All new `src/components/dasbor/*` and `src/components/realisasi-rab/*` files must be `"use client"`.
- Only query hooks from `@/lib/query/*`; no direct data-module imports in components.
- Use `formatRupiahCompact` for KPI values, `formatRupiah` for full amounts in tables.
- `Badge` variant mapping for health: `"hijau"→"success"`, `"kuning"→"warning"`, `"merah"→"destructive"`, `"abu"→"secondary"`.
- `Badge` variant mapping for alert priority: `"tinggi"→"destructive"`, `"sedang"→"warning"`.
- Loading state: use `Skeleton` from `@/components/ui/skeleton`; never show undefined/NaN to user.
- Empty state: render an empty table or "–" cells; never throw.
- No new tests required (presentational UI); run `npx tsc --noEmit` and `npx vitest run` to confirm no regressions.
- Run all commands from `/Users/lukydwisaputra/Desktop/Projects/sinar-buana/ERP`.
- Current HEAD: `0047b82` on branch `prototype/phase3-dasbor` (186/186 tests passing).

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/lib/dasbor/periode-utils.ts` | Create | `periodePreset()`, `labelPeriode()` pure helpers |
| `src/components/dasbor/period-picker.tsx` | Create | Period dropdown: MTD / QTD / YTD |
| `src/components/dasbor/kpi-strip.tsx` | Create | 8 KPI cards in 2 rows |
| `src/components/dasbor/needs-attention.tsx` | Create | Prioritised alert feed |
| `src/components/dasbor/pl-waterfall.tsx` | Create | P&L table: Revenue → Net |
| `src/components/dasbor/projected-cash.tsx` | Create | Weekly balance + runway |
| `src/components/dasbor/proyek-profitability.tsx` | Create | Per-project margin + health table |
| `src/components/realisasi-rab/realisasi-rab-form.tsx` | Create | FormSheet for entering actuals |
| `src/components/proyek/proyek-detail.tsx` | Modify | Add Realisasi RAB section |
| `src/app/(app)/dasbor/page.tsx` | Modify | Replace placeholder with full dashboard |

---

## Interfaces & Helpers

### `src/lib/dasbor/periode-utils.ts`

```ts
import type { Periode } from "@/lib/dasbor/types";

export type PeriodePreset = "mtd" | "qtd" | "ytd";

function lastDay(year: number, month: number): string {
  // month is 0-indexed
  const d = new Date(Date.UTC(year, month + 1, 0));
  return d.toISOString().slice(0, 10);
}

export function periodePreset(preset: PeriodePreset): Periode {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth(); // 0-indexed
  if (preset === "mtd") {
    return {
      mulai: `${y}-${String(m + 1).padStart(2, "0")}-01`,
      selesai: lastDay(y, m),
    };
  }
  if (preset === "qtd") {
    const qStart = Math.floor(m / 3) * 3;
    return {
      mulai: `${y}-${String(qStart + 1).padStart(2, "0")}-01`,
      selesai: lastDay(y, qStart + 2),
    };
  }
  // ytd
  return { mulai: `${y}-01-01`, selesai: `${y}-12-31` };
}

export const PRESET_LABELS: Record<PeriodePreset, string> = {
  mtd: "Bulan Ini",
  qtd: "Kuartal Ini",
  ytd: "Tahun Ini",
};

export function labelPeriode(mulai: string, selesai: string): string {
  // e.g. "Jun 2026" or "Jun – Des 2026"
  const fmt = (s: string) => {
    const d = new Date(s + "T00:00:00Z");
    return d.toLocaleDateString("id-ID", { month: "short", year: "numeric", timeZone: "UTC" });
  };
  return mulai.slice(0, 7) === selesai.slice(0, 7) ? fmt(mulai) : `${fmt(mulai)} – ${fmt(selesai)}`;
}
```

### Component prop types (use in each component)

```ts
// kpi-strip props
import type { LabaRugi, ForecastView } from "@/lib/dasbor/types";
interface KpiStripProps {
  labaRugi: LabaRugi | undefined;
  forecastView: ForecastView | undefined;
  arOutstanding: number;
  taxDue: number;
}

// needs-attention props
import type { AlertItem } from "@/lib/dasbor/types";
interface NeedsAttentionProps {
  alerts: AlertItem[];
  isLoading: boolean;
}

// pl-waterfall props
interface PlWaterfallProps {
  labaRugi: LabaRugi | undefined;
  isLoading: boolean;
}

// projected-cash props
interface ProjectedCashProps {
  forecastView: ForecastView | undefined;
  isLoading: boolean;
}

// proyek-profitability props
import type { ProyekProfit } from "@/lib/dasbor/types";
interface ProyekProfitabilityProps {
  proyek: ProyekProfit[];
  isLoading: boolean;
}
```

---

### Task 1: Period picker utils + PeriodPicker component

**Files:**
- Create: `src/lib/dasbor/periode-utils.ts`
- Create: `src/components/dasbor/period-picker.tsx`

**Interfaces:**
- Produces: `periodePreset`, `PRESET_LABELS`, `labelPeriode` from periode-utils.ts; `PeriodPicker` component

- [ ] **Step 1: Create `src/lib/dasbor/periode-utils.ts`**

Write the file verbatim from the Interfaces section above.

- [ ] **Step 2: Create `src/components/dasbor/period-picker.tsx`**

```tsx
"use client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { periodePreset, PRESET_LABELS, type PeriodePreset } from "@/lib/dasbor/periode-utils";
import type { Periode } from "@/lib/dasbor/types";

interface PeriodPickerProps {
  value: Periode;
  onChange: (p: Periode) => void;
}

export function PeriodPicker({ value, onChange }: PeriodPickerProps) {
  const currentPreset = (): PeriodePreset | "" => {
    const presets: PeriodePreset[] = ["mtd", "qtd", "ytd"];
    return (
      presets.find((p) => {
        const preset = periodePreset(p);
        return preset.mulai === value.mulai && preset.selesai === value.selesai;
      }) ?? ""
    );
  };

  const handleChange = (preset: PeriodePreset) => {
    onChange(periodePreset(preset));
  };

  return (
    <Select value={currentPreset()} onValueChange={(v) => handleChange(v as PeriodePreset)}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Pilih periode" />
      </SelectTrigger>
      <SelectContent>
        {(["mtd", "qtd", "ytd"] as PeriodePreset[]).map((p) => (
          <SelectItem key={p} value={p}>
            {PRESET_LABELS[p]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

Expected: no errors from the two new files.

- [ ] **Step 4: Run tests to confirm no regressions**

```bash
npx vitest run
```

Expected: 186 passing (or more if any pending fixes landed).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dasbor/periode-utils.ts src/components/dasbor/period-picker.tsx
git commit -m "feat(dasbor): add period picker utils and PeriodPicker component"
```

---

### Task 2: KPI Strip + Needs Attention + P&L Waterfall

**Files:**
- Create: `src/components/dasbor/kpi-strip.tsx`
- Create: `src/components/dasbor/needs-attention.tsx`
- Create: `src/components/dasbor/pl-waterfall.tsx`

**Interfaces:**
- Consumes: `LabaRugi`, `ForecastView`, `AlertItem` from `@/lib/dasbor/types`; `formatRupiahCompact`, `formatRupiah` from `@/lib/format`

- [ ] **Step 1: Create `src/components/dasbor/kpi-strip.tsx`**

```tsx
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
```

- [ ] **Step 2: Create `src/components/dasbor/needs-attention.tsx`**

```tsx
"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell } from "lucide-react";
import type { AlertItem } from "@/lib/dasbor/types";

interface NeedsAttentionProps {
  alerts: AlertItem[];
  isLoading: boolean;
}

const JENIS_LABEL: Record<string, string> = {
  faktur_terlambat: "Faktur",
  faktur_jatuh_tempo: "Faktur",
  pajak_terlambat: "Pajak",
  pajak_jatuh_tempo: "Pajak",
  bukti_potong_belum: "Pajak",
  proyek_over_budget: "Proyek",
  proyek_margin_slip: "Proyek",
};

export function NeedsAttention({ alerts, isLoading }: NeedsAttentionProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Bell className="size-4" />
          Perlu Perhatian
          {!isLoading && alerts.length > 0 && (
            <Badge variant="destructive" className="ml-1">{alerts.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded" />
            ))}
          </div>
        ) : alerts.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Tidak ada item yang memerlukan perhatian.</p>
        ) : (
          <ul className="divide-y">
            {alerts.map((a) => (
              <li key={a.id} className="flex items-start gap-3 py-2.5">
                <Badge
                  variant={a.prioritas === "tinggi" ? "destructive" : "warning"}
                  className="mt-0.5 shrink-0 text-[10px] uppercase"
                >
                  {JENIS_LABEL[a.jenis] ?? a.jenis}
                </Badge>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">{a.judul}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{a.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Create `src/components/dasbor/pl-waterfall.tsx`**

```tsx
"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiah } from "@/lib/format";
import type { LabaRugi } from "@/lib/dasbor/types";

interface PlWaterfallProps {
  labaRugi: LabaRugi | undefined;
  isLoading: boolean;
}

function Row({ label, value, bold, indent }: { label: string; value: number | undefined; bold?: boolean; indent?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 text-sm ${bold ? "font-semibold" : "font-normal"} ${indent ? "pl-4 text-muted-foreground" : ""}`}>
      <span>{label}</span>
      {value === undefined ? (
        <Skeleton className="h-4 w-28" />
      ) : (
        <span className={value < 0 ? "text-destructive" : ""}>{formatRupiah(value)}</span>
      )}
    </div>
  );
}

export function PlWaterfall({ labaRugi, isLoading }: PlWaterfallProps) {
  const d = isLoading ? undefined : labaRugi;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Laba Rugi (Akrual)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          <Row label="Pendapatan" value={d?.pendapatan} bold />
          <Row label="HPP (Realisasi RAB)" value={d ? -d.hpp : undefined} indent />
          <Row label="Laba Kotor" value={d?.labaKotor} bold />
          <Row label="Beban Operasional" value={d ? -d.bebanOperasional : undefined} indent />
          <Row label="Laba Operasional" value={d?.labaOperasional} bold />
          <Row label="PPh Badan (Est.)" value={d ? -d.pphBadan : undefined} indent />
          <Row label="Laba Bersih (Est.)" value={d?.labaBersih} bold />
        </div>
        {d?.adaPendapatanTanpaBiaya && (
          <p className="text-xs text-amber-600 mt-3">
            ⚠ Ada pendapatan tanpa biaya tercatat — margin bukan 100% sesungguhnya.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 4: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
```

- [ ] **Step 5: Run tests**

```bash
npx vitest run
```

- [ ] **Step 6: Commit**

```bash
git add src/components/dasbor/kpi-strip.tsx src/components/dasbor/needs-attention.tsx src/components/dasbor/pl-waterfall.tsx
git commit -m "feat(dasbor): add KPI strip, Needs Attention feed, and P&L Waterfall components"
```

---

### Task 3: Projected Cash + Per-Project Profitability table

**Files:**
- Create: `src/components/dasbor/projected-cash.tsx`
- Create: `src/components/dasbor/proyek-profitability.tsx`

**Interfaces:**
- Consumes: `ForecastView`, `ForecastEntry`, `WeeklyProjection`, `ProyekProfit`, `KesehatanProyek` from `@/lib/dasbor/types`

- [ ] **Step 1: Create `src/components/dasbor/projected-cash.tsx`**

```tsx
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
                  {forecastView.entries.map((e, i) => (
                    <div key={i} className="flex justify-between text-xs">
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
```

- [ ] **Step 2: Create `src/components/dasbor/proyek-profitability.tsx`**

```tsx
"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatRupiahCompact } from "@/lib/format";
import type { ProyekProfit, KesehatanProyek } from "@/lib/dasbor/types";

interface ProyekProfitabilityProps {
  proyek: ProyekProfit[];
  isLoading: boolean;
}

const HEALTH: Record<KesehatanProyek, { label: string; variant: "success" | "warning" | "destructive" | "secondary" }> = {
  hijau:  { label: "On Track",      variant: "success" },
  kuning: { label: "Waspada",       variant: "warning" },
  merah:  { label: "Over Budget",   variant: "destructive" },
  abu:    { label: "Belum Ada Data",variant: "secondary" },
};

export function ProyekProfitability({ proyek, isLoading }: ProyekProfitabilityProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Profitabilitas Proyek</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
          </div>
        ) : proyek.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Belum ada proyek.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-xs text-muted-foreground">
                  <th className="text-left py-1.5 font-medium">Proyek</th>
                  <th className="text-right py-1.5 font-medium">Kontrak</th>
                  <th className="text-right py-1.5 font-medium">RAB</th>
                  <th className="text-right py-1.5 font-medium">Realisasi</th>
                  <th className="text-right py-1.5 font-medium">Margin Aktual</th>
                  <th className="text-center py-1.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {proyek.map((p) => {
                  const h = HEALTH[p.kesehatan];
                  return (
                    <tr key={p.proyekId}>
                      <td className="py-2 font-medium">{p.proyekNama}</td>
                      <td className="py-2 text-right tabular-nums">{formatRupiahCompact(p.nilaiKontrak)}</td>
                      <td className="py-2 text-right tabular-nums">{formatRupiahCompact(p.rabRencana)}</td>
                      <td className="py-2 text-right tabular-nums">
                        {p.realisasi !== null ? formatRupiahCompact(p.realisasi) : <span className="text-muted-foreground">–</span>}
                      </td>
                      <td className="py-2 text-right tabular-nums">
                        {p.marginAktual !== null
                          ? <span className={p.marginAktual < 0 ? "text-destructive" : ""}>{formatRupiahCompact(p.marginAktual)}</span>
                          : <span className="text-muted-foreground">–</span>}
                      </td>
                      <td className="py-2 text-center">
                        <Badge variant={h.variant} className="text-[10px]">{h.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Verify TypeScript + run tests**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -20
npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add src/components/dasbor/projected-cash.tsx src/components/dasbor/proyek-profitability.tsx
git commit -m "feat(dasbor): add Projected Cash and Per-Project Profitability table components"
```

---

### Task 4: Realisasi RAB form + Proyek detail integration

**Files:**
- Create: `src/components/realisasi-rab/realisasi-rab-form.tsx`
- Modify: `src/components/proyek/proyek-detail.tsx`

**Interfaces:**
- Consumes: `useRealisasiRabByProyek`, `useCreateRealisasiRab`, `useRemoveRealisasiRab` from `@/lib/query/realisasi-rab`; `FormSheet` from `@/components/shared/form-sheet`; `MoneyInput` from `@/components/shared/money-input`
- `RealisasiRabFormValues = { proyekId, kategori: "personil"|"langsung", rabLineLabel, jumlah, tanggal, keterangan }`

- [ ] **Step 1: Create `src/components/realisasi-rab/realisasi-rab-form.tsx`**

```tsx
"use client";
import { useState } from "react";
import { FormSheet } from "@/components/shared/form-sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoneyInput } from "@/components/shared/money-input";
import { useCreateRealisasiRab } from "@/lib/query/realisasi-rab";
import type { RealisasiRabFormValues } from "@/lib/schemas/realisasi-rab";

interface RealisasiRabFormProps {
  proyekId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY = (proyekId: string): RealisasiRabFormValues => ({
  proyekId,
  kategori: "personil",
  rabLineLabel: "",
  jumlah: 0,
  tanggal: new Date().toISOString().slice(0, 10),
  keterangan: "",
});

export function RealisasiRabForm({ proyekId, open, onOpenChange }: RealisasiRabFormProps) {
  const [form, setForm] = useState<RealisasiRabFormValues>(EMPTY(proyekId));
  const { mutateAsync, isPending } = useCreateRealisasiRab();

  const handleSubmit = async () => {
    await mutateAsync(form);
    setForm(EMPTY(proyekId));
    onOpenChange(false);
  };

  const set = <K extends keyof RealisasiRabFormValues>(key: K, val: RealisasiRabFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const valid = form.rabLineLabel.trim().length > 0 && form.jumlah > 0 && form.tanggal.length === 10;

  return (
    <FormSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Catat Realisasi RAB"
      description="Masukkan biaya aktual yang telah dikeluarkan untuk proyek ini."
      onSubmit={handleSubmit}
      isSubmitting={isPending}
      disabled={!valid}
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label>Kategori</Label>
          <Select
            value={form.kategori}
            onValueChange={(v) => set("kategori", v as "personil" | "langsung")}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="personil">Personil (A)</SelectItem>
              <SelectItem value="langsung">Langsung (B)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Label RAB</Label>
          <Input
            placeholder="Mis: Tenaga Ahli 1, Material Kabel"
            value={form.rabLineLabel}
            onChange={(e) => set("rabLineLabel", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Jumlah (IDR)</Label>
          <MoneyInput
            value={form.jumlah}
            onChange={(v) => set("jumlah", v)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Tanggal</Label>
          <Input
            type="date"
            value={form.tanggal}
            onChange={(e) => set("tanggal", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label>Keterangan (opsional)</Label>
          <Input
            placeholder="Catatan tambahan"
            value={form.keterangan}
            onChange={(e) => set("keterangan", e.target.value)}
          />
        </div>
      </div>
    </FormSheet>
  );
}
```

- [ ] **Step 2: Integrate into `src/components/proyek/proyek-detail.tsx`**

Read the file first to find a good insertion point (near the top of the component where imports are, and near the JSX where milestones or other sections are rendered).

Add the following import at the top:
```tsx
import { useState } from "react";
import { RealisasiRabForm } from "@/components/realisasi-rab/realisasi-rab-form";
import { useRealisasiRabByProyek } from "@/lib/query/realisasi-rab";
import { formatRupiah } from "@/lib/format";
```

Inside the `ProyekDetail` component (or wherever the proyek `id` is available), add state and query:
```tsx
const [realisasiOpen, setRealisasiOpen] = useState(false);
const { data: realisasiList = [] } = useRealisasiRabByProyek(proyek.id);
const totalRealisasi = realisasiList.reduce((s, r) => s + r.jumlah, 0);
```

Add a Realisasi RAB section in the JSX, after the milestones section (or at the end of the card content). Find a suitable location and add:
```tsx
{/* Realisasi RAB Section */}
<div className="mt-6">
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-semibold">Realisasi RAB</h3>
    <Button size="sm" variant="outline" onClick={() => setRealisasiOpen(true)}>
      + Catat
    </Button>
  </div>
  {realisasiList.length === 0 ? (
    <p className="text-sm text-muted-foreground">Belum ada realisasi dicatat.</p>
  ) : (
    <div className="space-y-1">
      {realisasiList.map((r) => (
        <div key={r.id} className="flex justify-between text-sm py-1 border-b last:border-0">
          <span className="text-muted-foreground">{r.tanggal} · {r.kategori === "personil" ? "A" : "B"} · {r.rabLineLabel}</span>
          <span className="font-medium tabular-nums">{formatRupiah(r.jumlah)}</span>
        </div>
      ))}
      <div className="flex justify-between text-sm pt-2 font-semibold">
        <span>Total Realisasi</span>
        <span className="tabular-nums">{formatRupiah(totalRealisasi)}</span>
      </div>
    </div>
  )}
  <RealisasiRabForm
    proyekId={proyek.id}
    open={realisasiOpen}
    onOpenChange={setRealisasiOpen}
  />
</div>
```

- [ ] **Step 3: Verify TypeScript + run tests**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
npx vitest run
```

- [ ] **Step 4: Commit**

```bash
git add src/components/realisasi-rab/realisasi-rab-form.tsx src/components/proyek/proyek-detail.tsx
git commit -m "feat(dasbor): add Realisasi RAB form and integrate into Proyek detail"
```

---

### Task 5: Dasbor page wiring

**Files:**
- Modify: `src/app/(app)/dasbor/page.tsx`

**Interfaces:**
- Consumes: all dasbor components + `useProfitabilitas`, `useForekast`, `useAlerts` from `@/lib/query/dasbor`; `useFakturList` from `@/lib/query/faktur`; `useKewajibanPajakList` from `@/lib/query/kewajiban-pajak`; `computeFaktur` from `@/lib/faktur`; `periodePreset` from `@/lib/dasbor/periode-utils`

- [ ] **Step 1: Replace `src/app/(app)/dasbor/page.tsx`**

```tsx
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
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```

Expected: no errors from new files. Note any pre-existing errors but do not fix them.

- [ ] **Step 3: Run tests to confirm no regressions**

```bash
npx vitest run
```

Expected: 186+ passing.

- [ ] **Step 4: Start dev server and verify the page loads**

```bash
npm run dev &
```

Navigate to `http://localhost:3000/dasbor` and confirm:
- Period picker renders and switches between MTD/QTD/YTD
- KPI strip shows 8 cards with loading skeletons then values
- Needs Attention section renders (may be empty)
- P&L Waterfall shows revenue/cost breakdown
- Projected Cash shows weekly projections
- Per-Project table shows rows or empty state

Stop the dev server when done (`kill %1` or Ctrl-C).

- [ ] **Step 5: Commit**

```bash
git add src/app/\(app\)/dasbor/page.tsx
git commit -m "feat(dasbor): wire full Owner Command Center page"
```
