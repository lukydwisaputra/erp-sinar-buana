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
    <Card size="sm">
      <CardHeader>
        <CardTitle>Laba Rugi (Akrual)</CardTitle>
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
