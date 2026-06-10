"use client";
import { useRouter } from "next/navigation";
import { Eye, Lock } from "lucide-react";

import type { DealRekap, DealTerminRow, TerminPaymentStatus } from "@/lib/faktur";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type BadgeVariant = "success" | "warning" | "info" | "secondary" | "destructive";

const TERMIN_BADGE: Record<TerminPaymentStatus, { label: string; variant: BadgeVariant }> = {
  lunas: { label: "Lunas", variant: "success" },
  menunggu: { label: "Menunggu Bayar", variant: "warning" },
  draft: { label: "Draft", variant: "info" },
  belum: { label: "Belum Difakturkan", variant: "secondary" },
};

export function DealTerminCard({ deal, currentId }: { deal: DealRekap; currentId?: string }) {
  const router = useRouter();
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border bg-muted/30 p-4">
        <div>
          <div className="font-mono text-xs text-muted-foreground">
            {deal.sphId || "Faktur Manual"}
          </div>
          <div className="font-medium">{deal.perusahaanNama}</div>
        </div>
        <div className="min-w-48 text-right">
          <div className="text-sm">
            <span className="font-mono font-semibold tabular-nums">
              {formatRupiah(deal.terbayar)}
            </span>
            <span className="text-muted-foreground">
              {" "}/ {formatRupiah(deal.totalAfterTax)} terbayar
            </span>
          </div>
          <div className="mt-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${Math.min(100, Math.max(0, deal.persenTerbayar))}%` }}
              />
            </div>
            <span className="font-mono text-xs tabular-nums text-muted-foreground">
              {Math.round(deal.persenTerbayar)}%
            </span>
          </div>
        </div>
      </div>

      <div className="divide-y divide-border">
        {deal.termins.map((t) => (
          <TerminLine
            key={t.index}
            termin={t}
            router={router}
            active={!!currentId && t.faktur?.id === currentId}
          />
        ))}
      </div>
    </div>
  );
}

function TerminLine({
  termin: t,
  router,
  active,
}: {
  termin: DealTerminRow;
  router: ReturnType<typeof useRouter>;
  active: boolean;
}) {
  const badge =
    t.overdue
      ? { label: "Jatuh Tempo", variant: "destructive" as BadgeVariant }
      : TERMIN_BADGE[t.status];

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm",
        active && "bg-primary/5",
      )}
    >
      <div className="w-44 font-medium">
        {t.label} <span className="text-muted-foreground">({t.persen}%)</span>
      </div>
      {/* After-tax amount */}
      <div className="w-36 font-mono tabular-nums text-muted-foreground">
        {formatRupiah(t.nilaiAfterTax)}
      </div>
      {/* Faktur ID + status badge — left-aligned together */}
      <div className="flex flex-1 items-center gap-2">
        <span className="font-mono text-xs text-muted-foreground">{t.faktur?.id ?? "—"}</span>
        <Badge variant={badge.variant}>{badge.label}</Badge>
      </div>
      {t.faktur ? (
        <Button
          size="xs"
          variant="outline"
          disabled={active}
          onClick={() => router.push(`/faktur/${encodeURIComponent(t.faktur!.id)}`)}
        >
          <Eye /> {active ? "Sedang dibuka" : "Lihat"}
        </Button>
      ) : (
        <Button size="xs" variant="outline" disabled title="Termin belum tersedia">
          <Lock /> Terkunci
        </Button>
      )}
    </div>
  );
}
