"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  TrendingUpIcon,
  TrendingDownIcon,
  Maximize2Icon,
  CircleCheckIcon,
  ClockIcon,
  TriangleAlertIcon,
  FileTextIcon,
  BellIcon,
  ShieldCheckIcon,
  SettingsIcon,
  ChevronRightIcon,
} from "lucide-react";
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  Pie,
  PieChart,
  CartesianGrid,
  XAxis,
} from "recharts";

import { ShowcaseSection } from "@/components/design-system/showcase-section";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Separator } from "@/components/ui/separator";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { DataTable } from "@/components/shared/data-table";

/* ---------- DS-14 Card ---------- */
function CardShowcase() {
  return (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Faktur FK-2026-0142</CardTitle>
        <CardDescription>PT Maju Bersama Abadi</CardDescription>
        <CardAction>
          <Button variant="ghost" size="icon" aria-label="Perbesar">
            <Maximize2Icon />
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="text-muted-foreground">Total tagihan</p>
        <p className="font-mono text-xl tabular-nums">
          {formatRupiah(18750000)}
        </p>
        <p className="text-muted-foreground">Jatuh tempo 30 Jun 2026</p>
      </CardContent>
      <CardFooter className="justify-end gap-2">
        <Button variant="outline" size="sm">
          Rincian
        </Button>
        <Button size="sm">Tandai lunas</Button>
      </CardFooter>
    </Card>
  );
}

/* ---------- DS-15 KPI / stat card ---------- */
type Kpi = {
  label: string;
  value: number;
  deltaPct: number;
  up: boolean;
};

const KPIS: Kpi[] = [
  { label: "Total Tertagih", value: 145_000_000, deltaPct: 8, up: true },
  { label: "Kas Masuk", value: 92_400_000, deltaPct: 3, up: false },
  { label: "Proyek Aktif", value: 12, deltaPct: 2, up: true },
];

function KpiCard({ kpi, money }: { kpi: Kpi; money: boolean }) {
  const DeltaIcon = kpi.up ? TrendingUpIcon : TrendingDownIcon;
  return (
    <Card className="w-64">
      <CardHeader>
        <CardDescription className="text-xs tracking-wide uppercase">
          {kpi.label}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">
          {money ? formatRupiah(kpi.value) : kpi.value}
        </p>
        <p
          className={cn(
            "inline-flex items-center gap-1 text-xs font-medium",
            kpi.up ? "text-success" : "text-destructive"
          )}
        >
          <DeltaIcon className="size-3.5" />
          {kpi.deltaPct}% vs bulan lalu
        </p>
      </CardContent>
    </Card>
  );
}

function KpiShowcase() {
  return (
    <div className="flex w-full flex-wrap gap-4">
      {KPIS.map((kpi, i) => (
        <KpiCard key={kpi.label} kpi={kpi} money={i < 2} />
      ))}
    </div>
  );
}

/* ---------- DS-18 Badge / status set ---------- */
type StatusKey = "lunas" | "tertunda" | "jatuh-tempo" | "draf";

const STATUS: Record<
  StatusKey,
  {
    label: string;
    variant: "success" | "warning" | "destructive" | "info";
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  lunas: { label: "Lunas", variant: "success", icon: CircleCheckIcon },
  tertunda: { label: "Tertunda", variant: "warning", icon: ClockIcon },
  "jatuh-tempo": {
    label: "Jatuh Tempo",
    variant: "destructive",
    icon: TriangleAlertIcon,
  },
  draf: { label: "Draf", variant: "info", icon: FileTextIcon },
};

function StatusBadge({ status }: { status: StatusKey }) {
  const s = STATUS[status];
  const Icon = s.icon;
  return (
    <Badge variant={s.variant}>
      <Icon className="size-3" />
      {s.label}
    </Badge>
  );
}

function BadgeShowcase() {
  return (
    <div className="flex w-full flex-wrap items-center gap-3">
      {(Object.keys(STATUS) as StatusKey[]).map((k) => (
        <StatusBadge key={k} status={k} />
      ))}
    </div>
  );
}

/* ---------- DS-16 / DS-17 Data table + pagination ---------- */
type Invoice = {
  faktur: string;
  perusahaan: string;
  status: StatusKey;
  jumlah: number;
  jatuhTempo: string;
};

const INVOICES: Invoice[] = [
  {
    faktur: "FK-2026-0140",
    perusahaan: "PT Sinar Buana Sejahtera",
    status: "lunas",
    jumlah: 24_500_000,
    jatuhTempo: "12 Jun 2026",
  },
  {
    faktur: "FK-2026-0141",
    perusahaan: "PT Maju Bersama Abadi",
    status: "tertunda",
    jumlah: 18_750_000,
    jatuhTempo: "30 Jun 2026",
  },
  {
    faktur: "FK-2026-0142",
    perusahaan: "PT Cahaya Nusantara",
    status: "jatuh-tempo",
    jumlah: 9_200_000,
    jatuhTempo: "01 Jun 2026",
  },
  {
    faktur: "FK-2026-0143",
    perusahaan: "CV Karya Mandiri",
    status: "draf",
    jumlah: 5_400_000,
    jatuhTempo: "—",
  },
  {
    faktur: "FK-2026-0144",
    perusahaan: "PT Sentosa Logistik",
    status: "lunas",
    jumlah: 31_800_000,
    jatuhTempo: "08 Jun 2026",
  },
  {
    faktur: "FK-2026-0145",
    perusahaan: "PT Mitra Sukses Perkasa",
    status: "tertunda",
    jumlah: 14_300_000,
    jatuhTempo: "25 Jun 2026",
  },
];

const invoiceColumns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "faktur",
    header: "No. Faktur",
    cell: ({ row }) => (
      <span className="font-mono">{row.original.faktur}</span>
    ),
  },
  {
    accessorKey: "perusahaan",
    header: "Perusahaan",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    filterFn: (row, id, value) => row.getValue(id) === value,
    enableSorting: false,
  },
  {
    accessorKey: "jumlah",
    header: "Jumlah",
    meta: { align: "right", mono: true },
    cell: ({ row }) => formatRupiah(row.original.jumlah),
  },
  {
    accessorKey: "jatuhTempo",
    header: "Jatuh Tempo",
    enableSorting: false,
  },
];

// Reduced column set for the compact state demos (loading / empty / error).
const compactColumns: ColumnDef<Invoice>[] = [
  {
    accessorKey: "faktur",
    header: "No. Faktur",
    cell: ({ row }) => (
      <span className="font-mono">{row.original.faktur}</span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "jumlah",
    header: "Jumlah",
    meta: { align: "right", mono: true },
    cell: ({ row }) => formatRupiah(row.original.jumlah),
    enableSorting: false,
  },
];

function DataTableStatesShowcase() {
  return (
    <div className="flex w-full flex-col gap-3">
      <p className="text-sm font-medium text-muted-foreground">
        Status tabel: memuat / kosong / gagal
      </p>
      <div className="grid w-full gap-6 md:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs tracking-wide text-muted-foreground uppercase">
            Memuat
          </span>
          <DataTable
            columns={compactColumns}
            data={[]}
            loading
            initialPageSize={3}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs tracking-wide text-muted-foreground uppercase">
            Kosong
          </span>
          <DataTable
            columns={compactColumns}
            data={[]}
            emptyMessage="Belum ada data"
            initialPageSize={3}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs tracking-wide text-muted-foreground uppercase">
            Gagal
          </span>
          <DataTable
            columns={compactColumns}
            data={[]}
            error="Gagal memuat data"
            onRetry={() => {}}
            initialPageSize={3}
          />
        </div>
      </div>
    </div>
  );
}

function DataTableShowcase() {
  return (
    <div className="flex w-full flex-col gap-8">
      <DataTable
        columns={invoiceColumns}
        data={INVOICES}
        searchColumn="perusahaan"
        searchPlaceholder="Cari perusahaan…"
        filterColumn="status"
        filterPlaceholder="Semua status"
        filterOptions={[
          { label: "Lunas", value: "lunas" },
          { label: "Tertunda", value: "tertunda" },
          { label: "Jatuh Tempo", value: "jatuh-tempo" },
          { label: "Draf", value: "draf" },
        ]}
        initialPageSize={5}
      />
      <DataTableStatesShowcase />
    </div>
  );
}

/* ---------- DS-19 Avatar (+ stack) ---------- */
function AvatarShowcase() {
  return (
    <div className="flex w-full flex-wrap items-center gap-10">
      <Avatar>
        <AvatarImage src="/avatar-broken.png" alt="Siti Aminah" />
        <AvatarFallback>SA</AvatarFallback>
      </Avatar>

      <AvatarGroup>
        <Avatar>
          <AvatarFallback>BS</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>SA</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>RW</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>DK</AvatarFallback>
        </Avatar>
        <AvatarGroupCount>+3</AvatarGroupCount>
      </AvatarGroup>
    </div>
  );
}

/* ---------- DS-20 Progress ---------- */
function ProgressShowcase() {
  return (
    <div className="flex w-full flex-col gap-6">
      <div className="grid w-80 gap-1.5">
        <div className="flex items-center justify-between text-sm">
          <span>Proyek: Renovasi Gudang</span>
          <span className="font-mono tabular-nums text-muted-foreground">
            65%
          </span>
        </div>
        <Progress value={65} aria-label="Proyek: 65%" />
      </div>

      <div className="grid w-80 gap-1.5">
        <span className="text-sm">Sinkronisasi data…</span>
        <Progress
          aria-label="Memuat"
          className="[&_[data-slot=progress-indicator]]:animate-pulse [&_[data-slot=progress-indicator]]:w-1/3 [&_[data-slot=progress-indicator]]:!translate-x-0"
        />
      </div>
    </div>
  );
}

/* ---------- DS-21 Item ---------- */
function ItemShowcase() {
  const rows = [
    {
      icon: BellIcon,
      title: "Notifikasi pembayaran",
      desc: "Kirim pengingat saat faktur mendekati jatuh tempo.",
      action: "Atur",
    },
    {
      icon: ShieldCheckIcon,
      title: "Verifikasi dua langkah",
      desc: "Tingkatkan keamanan akun dengan OTP.",
      action: "Aktifkan",
    },
    {
      icon: SettingsIcon,
      title: "Preferensi ekspor",
      desc: "Format laporan PDF dan penamaan berkas.",
      action: "Kelola",
    },
  ];
  return (
    <ItemGroup className="w-full max-w-lg">
      {rows.map((r) => {
        const Icon = r.icon;
        return (
          <Item key={r.title} variant="outline">
            <ItemMedia variant="icon">
              <Icon />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>{r.title}</ItemTitle>
              <ItemDescription>{r.desc}</ItemDescription>
            </ItemContent>
            <ItemActions>
              <Button variant="ghost" size="sm">
                {r.action}
                <ChevronRightIcon />
              </Button>
            </ItemActions>
          </Item>
        );
      })}
    </ItemGroup>
  );
}

/* ---------- DS-22 Charts ---------- */
const cashFlow = [
  { bulan: "Jan", arus: 62 },
  { bulan: "Feb", arus: 71 },
  { bulan: "Mar", arus: 58 },
  { bulan: "Apr", arus: 84 },
  { bulan: "Mei", arus: 79 },
  { bulan: "Jun", arus: 92 },
];
const cashFlowConfig = {
  arus: { label: "Arus kas (juta)", color: "var(--chart-1)" },
} satisfies ChartConfig;

const revenue = [
  { bulan: "Jan", nilai: 120 },
  { bulan: "Feb", nilai: 145 },
  { bulan: "Mar", nilai: 132 },
  { bulan: "Apr", nilai: 168 },
  { bulan: "Mei", nilai: 154 },
  { bulan: "Jun", nilai: 181 },
];
const revenueConfig = {
  nilai: { label: "Pendapatan (juta)", color: "var(--chart-2)" },
} satisfies ChartConfig;

const cashByCategory = [
  { kategori: "Operasional", nilai: 42, fill: "var(--chart-1)" },
  { kategori: "Bahan baku", nilai: 28, fill: "var(--chart-2)" },
  { kategori: "Gaji", nilai: 19, fill: "var(--chart-3)" },
  { kategori: "Lainnya", nilai: 11, fill: "var(--chart-4)" },
];
const categoryConfig = {
  nilai: { label: "Kas" },
  Operasional: { label: "Operasional", color: "var(--chart-1)" },
  "Bahan baku": { label: "Bahan baku", color: "var(--chart-2)" },
  Gaji: { label: "Gaji", color: "var(--chart-3)" },
  Lainnya: { label: "Lainnya", color: "var(--chart-4)" },
} satisfies ChartConfig;

function ChartsShowcase() {
  return (
    <div className="grid w-full gap-6 md:grid-cols-3">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Arus kas — 6 bulan</p>
        <ChartContainer config={cashFlowConfig} className="h-48 w-full">
          <LineChart data={cashFlow} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="bulan" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Line
              dataKey="arus"
              type="monotone"
              stroke="var(--color-arus)"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartContainer>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Pendapatan per bulan</p>
        <ChartContainer config={revenueConfig} className="h-48 w-full">
          <BarChart data={revenue} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="bulan" tickLine={false} axisLine={false} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="nilai" fill="var(--color-nilai)" radius={4} />
          </BarChart>
        </ChartContainer>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium">Kas per kategori</p>
        <ChartContainer
          config={categoryConfig}
          className="mx-auto aspect-square h-48"
        >
          <PieChart>
            <ChartTooltip
              content={<ChartTooltipContent nameKey="kategori" />}
            />
            <Pie
              data={cashByCategory}
              dataKey="nilai"
              nameKey="kategori"
              innerRadius={45}
              strokeWidth={2}
            />
          </PieChart>
        </ChartContainer>
      </div>
    </div>
  );
}

/* ---------- DS-23 Separator ---------- */
function SeparatorShowcase() {
  return (
    <div className="flex w-full max-w-md flex-col gap-4">
      <div>
        <p className="text-sm font-medium">Ringkasan faktur</p>
        <p className="text-sm text-muted-foreground">
          Total dan status pembayaran.
        </p>
      </div>
      <Separator />
      <div className="flex h-5 items-center gap-3 text-sm">
        <span>Faktur</span>
        <Separator orientation="vertical" />
        <span>Pembayaran</span>
        <Separator orientation="vertical" />
        <span className="text-muted-foreground">Riwayat</span>
      </div>
    </div>
  );
}

/* ---------- DS-24 Aspect-ratio ---------- */
function AspectRatioShowcase() {
  return (
    <div className="flex w-full flex-wrap items-start gap-8">
      <div className="w-56">
        <AspectRatio
          ratio={1 / 1.414}
          className="flex items-center justify-center rounded-md border border-border bg-muted text-sm text-muted-foreground"
        >
          Pratinjau PDF (A4)
        </AspectRatio>
      </div>
      <div className="w-72">
        <AspectRatio
          ratio={16 / 9}
          className="flex items-center justify-center rounded-md border border-border bg-muted text-sm text-muted-foreground"
        >
          Logo perusahaan (16:9)
        </AspectRatio>
      </div>
    </div>
  );
}

/* ---------- Section assembly ---------- */
export function DataSection() {
  return (
    <>
      <ShowcaseSection
        id="data-kartu"
        title="Kartu & KPI"
        description="Kartu dasar dan kartu statistik (KPI) — label kapital, nilai mono besar, delta berwarna."
      >
        <CardShowcase />
        <KpiShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="data-tabel"
        title="Tabel Data"
        description="Tabel TanStack yang dapat diurutkan, difilter, dan dipaginasi. Kolom jumlah mono, tabular, rata kanan. Komponen DataTable generik untuk dipakai ulang."
      >
        <DataTableShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="data-status"
        title="Badge Status"
        description="Set status keuangan: latar lembut + teks AA + ikon Lucide. 'Lunas' memakai hijau gelap (brand-deep) agar terbaca pada mode terang."
      >
        <BadgeShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="data-avatar"
        title="Avatar, Progress & Item"
        description="Avatar tunggal & tumpukan, progress determinate/indeterminate, dan baris pengaturan (Item)."
      >
        <AvatarShowcase />
        <ProgressShowcase />
        <ItemShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="data-grafik"
        title="Grafik"
        description="Grafik garis (arus kas), batang (pendapatan), dan donat (kas per kategori) dengan warna token chart."
      >
        <ChartsShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="data-pembagi"
        title="Pembagi & Rasio"
        description="Pemisah horizontal/vertikal dan bingkai rasio aspek (pratinjau PDF A4, logo 16:9)."
      >
        <SeparatorShowcase />
        <AspectRatioShowcase />
      </ShowcaseSection>
    </>
  );
}
