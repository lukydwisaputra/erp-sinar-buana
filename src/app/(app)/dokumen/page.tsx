"use client";
import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Mail, MessageCircle, Send, TriangleAlert } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePengirimanLog } from "@/lib/query/pengiriman";
import type { ChannelPengiriman, DeliveryStatus, JenisDokumenKirim, PengirimanLog } from "@/lib/schemas/pengiriman";

// ── Helpers ──────────────────────────────────────────────────────────────

function tanggalWaktuID(iso: string) {
  return new Date(iso).toLocaleString("id-ID", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

const JENIS_META: Record<JenisDokumenKirim, { label: string; variant: "info" | "secondary" | "warning" }> = {
  sph: { label: "SPH", variant: "info" },
  faktur: { label: "Invoice", variant: "warning" },
  slip: { label: "Slip Gaji", variant: "secondary" },
};

function JenisBadge({ jenis }: { jenis: JenisDokumenKirim }) {
  const m = JENIS_META[jenis];
  return <Badge variant={m.variant}>{m.label}</Badge>;
}

function ChannelBadge({ channel }: { channel: ChannelPengiriman }) {
  return channel === "whatsapp" ? (
    <Badge variant="success"><MessageCircle className="size-3" /> WhatsApp</Badge>
  ) : (
    <Badge variant="info"><Mail className="size-3" /> Email</Badge>
  );
}

const STATUS_META: Record<DeliveryStatus, { label: string; variant: "warning" | "success" | "destructive" }> = {
  queued: { label: "Menunggu", variant: "warning" },
  sent: { label: "Terkirim", variant: "success" },
  failed: { label: "Gagal", variant: "destructive" },
};

function StatusBadge({ status, error }: { status: DeliveryStatus; error: string | null }) {
  const m = STATUS_META[status];
  const badge = <Badge variant={m.variant}>{m.label}</Badge>;
  if (status !== "failed" || !error) return badge;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center gap-1">
          {badge}
          <TriangleAlert className="size-3 text-destructive" />
        </span>
      </TooltipTrigger>
      <TooltipContent>{error}</TooltipContent>
    </Tooltip>
  );
}

// ── Table columns ─────────────────────────────────────────────────────────

const columns: ColumnDef<PengirimanLog>[] = [
  {
    accessorKey: "timestamp",
    header: "Tanggal",
    meta: { mono: true },
    cell: ({ row }) => <span className="font-mono">{tanggalWaktuID(row.original.timestamp)}</span>,
  },
  {
    accessorKey: "jenisDokumen",
    header: "Dokumen",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <JenisBadge jenis={row.original.jenisDokumen} />
        <span className="font-mono text-xs">{row.original.dokumenNomor}</span>
      </div>
    ),
  },
  {
    accessorKey: "tujuanNama",
    header: "Tujuan",
  },
  {
    accessorKey: "tujuanKontak",
    header: "Kontak",
    meta: { mono: true, className: "text-muted-foreground" },
  },
  {
    accessorKey: "channel",
    header: "Channel",
    cell: ({ row }) => <ChannelBadge channel={row.original.channel} />,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <StatusBadge status={row.original.status} error={row.original.error} />,
  },
];

// ── KPI strip ─────────────────────────────────────────────────────────────

function KpiCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ElementType }) {
  return (
    <Card size="sm">
      <CardContent className="flex items-start justify-between gap-2 pt-0">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="font-mono text-lg font-semibold leading-tight">{value}</p>
        </div>
        <Icon className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────

export default function Page() {
  const { data, isLoading, isError, refetch } = usePengirimanLog();

  const kpi = React.useMemo(() => {
    const all = data ?? [];
    const whatsapp = all.filter((r) => r.channel === "whatsapp").length;
    const email = all.filter((r) => r.channel === "email").length;
    const failed = all.filter((r) => r.status === "failed").length;
    return { total: all.length, whatsapp, email, failed };
  }, [data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Send className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Pengiriman Dokumen</h1>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <KpiCard label="Total Terkirim" value={String(kpi.total)} icon={Send} />
        <KpiCard label="Via WhatsApp" value={String(kpi.whatsapp)} icon={MessageCircle} />
        <KpiCard label="Via Email" value={String(kpi.email)} icon={Mail} />
        <KpiCard label="Gagal Terkirim" value={String(kpi.failed)} icon={TriangleAlert} />
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          searchColumns={["dokumenNomor", "tujuanNama"]}
          searchPlaceholder="Cari nomor dokumen atau tujuan…"
          emptyMessage="Belum ada riwayat pengiriman"
          defaultSorting={[{ id: "timestamp", desc: true }]}
          rowActions={false}
        />
      )}
    </div>
  );
}
