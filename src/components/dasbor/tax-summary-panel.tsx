"use client";
import Link from "next/link";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MaskedValue } from "@/components/shared/masked-value";
import { formatRupiah } from "@/lib/format";
import type { TaxSummary } from "@/lib/dasbor/tax-summary";

function tanggalID(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

interface TaxSummaryPanelProps {
  summary: TaxSummary | undefined;
  isLoading: boolean;
}

/** FR-09.5 — Ringkasan Pajak (view_tax_detail territory). */
export function TaxSummaryPanel({ summary, isLoading }: TaxSummaryPanelProps) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle className="text-sm">Ringkasan Pajak</CardTitle>
        <CardAction>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link href="/pajak">Lihat Semua</Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isLoading || !summary ? (
          <Skeleton className="h-16 w-full" />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div>
              <p className="text-xs text-muted-foreground">Belum Disetor</p>
              <p className="mt-1 font-mono text-lg font-semibold"><MaskedValue>{formatRupiah(summary.belumDisetor)}</MaskedValue></p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Jatuh Tempo Terdekat</p>
              <p className="mt-1 font-mono text-lg font-semibold">
                {summary.jatuhTempoTerdekat ? tanggalID(summary.jatuhTempoTerdekat) : "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Terlambat</p>
              <p className="mt-1">
                {summary.terlambatCount > 0 ? (
                  <Badge variant="destructive">{summary.terlambatCount} item</Badge>
                ) : (
                  <span className="font-mono text-lg font-semibold">0</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Kredit PPh Terkumpul</p>
              <p className="mt-1 font-mono text-lg font-semibold"><MaskedValue>{formatRupiah(summary.pph23KreditTerkumpul)}</MaskedValue></p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
