"use client";
import { useRouter } from "next/navigation";
import { Eye, Plus } from "lucide-react";

import type { Faktur } from "@/lib/schemas/faktur";
import { groupFakturByDeal, type TerminPaymentStatus } from "@/lib/faktur";
import { formatRupiah } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type BadgeVariant = "success" | "warning" | "info" | "secondary" | "destructive";

const TERMIN_BADGE: Record<TerminPaymentStatus, { label: string; variant: BadgeVariant }> = {
  lunas: { label: "Lunas", variant: "success" },
  menunggu: { label: "Menunggu Bayar", variant: "warning" },
  draft: { label: "Draft", variant: "info" },
  belum: { label: "Belum Difakturkan", variant: "secondary" },
};

/** Per-deal termin tracker: each deal's full schedule + the payment status of every termin. */
export function FakturRekap({ fakturs }: { fakturs: Faktur[] }) {
  const router = useRouter();
  const deals = groupFakturByDeal(fakturs);

  if (deals.length === 0) {
    return <p className="text-sm text-muted-foreground">Belum ada faktur.</p>;
  }

  return (
    <div className="space-y-4">
      {deals.map((d) => (
        <div key={d.key} className="overflow-hidden rounded-lg border border-border">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border bg-muted/30 p-4">
            <div>
              <div className="font-mono text-xs text-muted-foreground">{d.sphId || "Faktur Manual"}</div>
              <div className="font-medium">{d.perusahaanNama}</div>
            </div>
            <div className="min-w-48 text-right">
              <div className="text-sm">
                <span className="font-mono font-semibold tabular-nums">{formatRupiah(d.terbayar)}</span>
                <span className="text-muted-foreground"> / {formatRupiah(d.totalBiaya)} terbayar</span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, Math.max(0, d.persenTerbayar))}%` }} />
                </div>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">{Math.round(d.persenTerbayar)}%</span>
              </div>
            </div>
          </div>

          <div className="divide-y divide-border">
            {d.termins.map((t) => {
              const badge = t.overdue ? { label: "Jatuh Tempo", variant: "destructive" as BadgeVariant } : TERMIN_BADGE[t.status];
              return (
                <div key={t.index} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                  <div className="w-44 font-medium">
                    {t.label} <span className="text-muted-foreground">({t.persen}%)</span>
                  </div>
                  <div className="w-36 font-mono tabular-nums text-muted-foreground">{formatRupiah(t.nilai)}</div>
                  <div className="flex-1 font-mono text-xs text-muted-foreground">{t.faktur?.id ?? "—"}</div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                  {t.faktur ? (
                    <Button size="xs" variant="outline" onClick={() => router.push(`/faktur/${encodeURIComponent(t.faktur!.id)}`)}>
                      <Eye /> Lihat
                    </Button>
                  ) : (
                    <Button size="xs" variant="outline" onClick={() => router.push("/faktur/baru")}>
                      <Plus /> Buat Faktur
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
