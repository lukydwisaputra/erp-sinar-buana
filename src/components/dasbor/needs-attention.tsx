"use client";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Card size="sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="size-4" />
          Perlu Perhatian
        </CardTitle>
        {!isLoading && alerts.length > 0 && (
          <CardAction>
            <Badge variant="destructive">{alerts.length}</Badge>
          </CardAction>
        )}
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
                  className="mt-0.5 shrink-0 uppercase"
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
