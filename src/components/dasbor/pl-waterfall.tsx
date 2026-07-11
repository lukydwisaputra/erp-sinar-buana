"use client";
import React from "react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDownIcon } from "lucide-react";
import { MaskedValue } from "@/components/shared/masked-value";
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
        <span className={value < 0 ? "text-destructive" : ""}><MaskedValue>{formatRupiah(value)}</MaskedValue></span>
      )}
    </div>
  );
}

export function PlWaterfall({ labaRugi, isLoading }: PlWaterfallProps) {
  const [open, setOpen] = React.useState(true);
  const d = isLoading ? undefined : labaRugi;
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Laba Rugi (Aktual)</CardTitle>
        <CardAction>
          <Button variant="ghost" size="icon" className="size-6" onClick={() => setOpen((o) => !o)}>
            <ChevronDownIcon className={`size-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
          </Button>
        </CardAction>
      </CardHeader>
      {open && (
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
      )}
    </Card>
  );
}
