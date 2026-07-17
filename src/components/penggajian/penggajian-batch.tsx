"use client";
import * as React from "react";
import Link from "next/link";
import { Wallet, EllipsisIcon, ExternalLink, CircleDollarSign, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ComponentsEditor } from "@/components/penggajian/components-editor";
import { formatRupiah, formatTanggalPanjang } from "@/lib/format";
import { calcSlip, type PenggajianBatch, type SlipGaji } from "@/lib/schemas/penggajian";
import { useBatch, useUpdateSlip, useMarkSlipDibayar, useCancelSlip } from "@/lib/query/penggajian";

function periodStr(p: PenggajianBatch["periode"]) {
  return `${formatTanggalPanjang(p.mulai)} – ${formatTanggalPanjang(p.selesai)}`;
}

const STATUS_BADGE: Record<SlipGaji["status"], { label: string; variant: "success" | "warning" | "secondary" }> = {
  sudah_dibayar: { label: "Dibayar", variant: "success" },
  menunggu_pembayaran: { label: "Menunggu", variant: "warning" },
  batal: { label: "Dibatalkan", variant: "secondary" },
};

function SlipCard({ slip, batchId }: { slip: SlipGaji; batchId: string }) {
  const updateSlip = useUpdateSlip();
  const markDibayar = useMarkSlipDibayar();
  const cancelSlip = useCancelSlip();
  const [confirmDibayar, setConfirmDibayar] = React.useState(false);
  const [confirmBatal, setConfirmBatal] = React.useState(false);

  const locked = slip.status !== "menunggu_pembayaran";
  const { gajiPokokEfektif, penggajianKotor, penggajianBersih } = calcSlip(slip);
  const badge = STATUS_BADGE[slip.status];

  return (
    <>
      <div className="rounded-lg border border-border p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-base font-medium">{slip.karyawanNama}</p>
              <Badge variant={badge.variant} className="text-sm">{badge.label}</Badge>
              {slip.number && <span className="font-mono text-sm text-muted-foreground">{slip.number}</span>}
            </div>
            <p className="text-sm text-muted-foreground">{slip.jabatan} &middot; Gaji Efektif {formatRupiah(gajiPokokEfektif)}</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="text-muted-foreground">Kotor</p>
              <p className="font-mono font-medium">{formatRupiah(penggajianKotor)}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-muted-foreground">Bersih</p>
              <p className={`font-mono font-semibold ${penggajianBersih < 0 ? "text-destructive" : ""}`}>{formatRupiah(penggajianBersih)}</p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7">
                  <EllipsisIcon className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                <DropdownMenuItem asChild className="text-xs">
                  <Link href={`/penggajian/${encodeURIComponent(batchId)}/${slip.id}`}>
                    <ExternalLink className="mr-1.5 size-3" /> Lihat Slip
                  </Link>
                </DropdownMenuItem>
                {!locked && (
                  <>
                    <DropdownMenuItem onSelect={() => setConfirmDibayar(true)} className="text-xs">
                      <CircleDollarSign className="mr-1.5 size-3" /> Tandai Dibayar
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onSelect={() => setConfirmBatal(true)} className="text-xs">
                      <Ban className="mr-1.5 size-3" /> Batalkan
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-3 rounded-md bg-muted/30 p-3">
          <div>
            <p className="text-xs text-muted-foreground">Lembur</p>
            <p className="font-mono text-sm font-medium">{formatRupiah(slip.lembur)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Bonus</p>
            <p className="font-mono text-sm font-medium">{formatRupiah(slip.bonus)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">PPh 21</p>
            <p className="font-mono text-sm font-medium">{formatRupiah(slip.pph21)}</p>
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-sm font-medium text-muted-foreground">Komponen (Tunjangan/Potongan)</p>
          <ComponentsEditor
            components={slip.components}
            disabled={locked}
            onChange={(v) => updateSlip.mutate({ batchId, slipId: slip.id, patch: { components: v } })}
          />
        </div>
      </div>

      <AlertDialog open={confirmDibayar} onOpenChange={setConfirmDibayar}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tandai sudah dibayar?</AlertDialogTitle>
            <AlertDialogDescription>
              Slip gaji <strong>{slip.karyawanNama}</strong> akan ditandai sudah dibayar sebesar{" "}
              <strong>{formatRupiah(penggajianBersih)}</strong> (take-home). Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={markDibayar.isPending}
              onClick={() => markDibayar.mutate({ batchId, slipId: slip.id }, { onSuccess: () => setConfirmDibayar(false) })}
            >
              Tandai Dibayar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBatal} onOpenChange={setConfirmBatal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan slip ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Slip gaji <strong>{slip.karyawanNama}</strong> akan dibatalkan. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={cancelSlip.isPending}
              onClick={() => cancelSlip.mutate({ batchId, slipId: slip.id }, { onSuccess: () => setConfirmBatal(false) })}
            >
              Ya, Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function PenggajianBatchDetail({ batchId }: { batchId: string }) {
  const { data: batch, isLoading } = useBatch(batchId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="size-5 text-muted-foreground" />
          <Skeleton className="h-7 w-56" />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Wallet className="size-10 text-muted-foreground/40 mb-4" />
        <p className="font-medium">Batch tidak ditemukan</p>
      </div>
    );
  }

  const paid = batch.slips.filter((s) => s.status === "sudah_dibayar").length;
  const total = batch.slips.length;
  const totals = batch.slips.reduce((acc, s) => {
    const { penggajianKotor, penggajianBersih } = calcSlip(s);
    return { kotor: acc.kotor + penggajianKotor, bersih: acc.bersih + penggajianBersih };
  }, { kotor: 0, bersih: 0 });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Wallet className="size-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold tracking-tight">{periodStr(batch.periode)}</h1>
            <Badge variant={paid === total ? "success" : paid > 0 ? "warning" : "secondary"}>
              {paid}/{total} Dibayar
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">Tanggal Bayar {formatTanggalPanjang(batch.tanggalBayar)}</p>
        </div>
        <div className="flex items-center gap-4 text-right text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Total Kotor</p>
            <p className="font-mono font-semibold">{formatRupiah(totals.kotor)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Bersih</p>
            <p className={`font-mono font-semibold ${totals.bersih < 0 ? "text-destructive" : ""}`}>{formatRupiah(totals.bersih)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {batch.slips.map((slip) => (
          <SlipCard key={slip.id} slip={slip} batchId={batch.id} />
        ))}
      </div>
    </div>
  );
}
