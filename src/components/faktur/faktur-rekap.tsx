"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, Lock, Plus } from "lucide-react";

import type { Faktur } from "@/lib/schemas/faktur";
import { groupFakturByDeal, type DealTerminRow, type TerminPaymentStatus } from "@/lib/faktur";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";

type BadgeVariant = "success" | "warning" | "info" | "secondary" | "destructive";

const TERMIN_BADGE: Record<TerminPaymentStatus, { label: string; variant: BadgeVariant }> = {
  lunas: { label: "Lunas", variant: "success" },
  menunggu: { label: "Menunggu Bayar", variant: "warning" },
  draft: { label: "Draft", variant: "info" },
  belum: { label: "Belum Difakturkan", variant: "secondary" },
};

const PAGE_SIZE = 4;

/** Per-deal termin tracker: each deal's full schedule + the payment status of every termin. */
export function FakturRekap({ fakturs }: { fakturs: Faktur[] }) {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [page, setPage] = React.useState(0);

  const allDeals = React.useMemo(() => groupFakturByDeal(fakturs), [fakturs]);
  const deals = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allDeals;
    return allDeals.filter(
      (d) => d.perusahaanNama.toLowerCase().includes(q) || d.sphId.toLowerCase().includes(q),
    );
  }, [allDeals, query]);

  const pageCount = Math.max(1, Math.ceil(deals.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const shown = deals.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  React.useEffect(() => setPage(0), [query]);

  return (
    <div className="flex w-full flex-col gap-3">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Cari perusahaan atau No. SPH…"
        className="h-9 w-84"
      />

      {shown.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada deal yang cocok.</p>
      ) : (
        <div className="space-y-4">
          {shown.map((d) => (
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
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">{Math.round(d.persenTerbayar)}%</span>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-border">
                {d.termins.map((t) => (
                  <TerminLine key={t.index} deal={d.sphId} termin={t} router={router} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {pageCount > 1 && (
        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                text="Sebelumnya" href="#" aria-disabled={current === 0}
                className={cn(current === 0 && "pointer-events-none opacity-50")}
                onClick={(e) => { e.preventDefault(); setPage((p) => Math.max(0, p - 1)); }}
              />
            </PaginationItem>
            {Array.from({ length: pageCount }).map((_, i) => (
              <PaginationItem key={i}>
                <PaginationLink href="#" isActive={i === current} onClick={(e) => { e.preventDefault(); setPage(i); }}>
                  {i + 1}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                text="Berikutnya" href="#" aria-disabled={current >= pageCount - 1}
                className={cn(current >= pageCount - 1 && "pointer-events-none opacity-50")}
                onClick={(e) => { e.preventDefault(); setPage((p) => Math.min(pageCount - 1, p + 1)); }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}

function TerminLine({ deal, termin: t, router }: { deal: string; termin: DealTerminRow; router: ReturnType<typeof useRouter> }) {
  const badge = t.overdue ? { label: "Jatuh Tempo", variant: "destructive" as BadgeVariant } : TERMIN_BADGE[t.status];
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
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
      ) : t.canCreate ? (
        <Button size="xs" variant="outline" onClick={() => router.push(`/faktur/baru?deal=${encodeURIComponent(deal)}&termin=${t.index}`)}>
          <Plus /> Buat Faktur
        </Button>
      ) : (
        <Button size="xs" variant="outline" disabled title="Selesaikan pembayaran termin sebelumnya dulu">
          <Lock /> Terkunci
        </Button>
      )}
    </div>
  );
}
