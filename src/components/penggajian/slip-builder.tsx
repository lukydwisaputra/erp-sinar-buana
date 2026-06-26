"use client";
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Download, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScaleToFit } from "@/components/shared/scale-to-fit";
import { SlipDocument } from "@/components/penggajian/slip-document";
import { calcSlip } from "@/lib/schemas/penggajian";
import { formatRupiah } from "@/lib/format";
import { useSlip, useBatch, useMarkSlipDibayar } from "@/lib/query/penggajian";

export function SlipBuilder({ batchId, slipId }: { batchId: string; slipId: string }) {
  const { data: batch } = useBatch(batchId);
  const { data: slip, isLoading } = useSlip(batchId, slipId);
  const markDibayar = useMarkSlipDibayar();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </div>
    );
  }

  if (!slip || !batch) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <Wallet className="size-10 text-muted-foreground/40 mb-4" />
        <p className="font-medium">Slip tidak ditemukan</p>
      </div>
    );
  }

  const { penggajianBersih } = calcSlip(slip);
  const locked = slip.status === "sudah_dibayar";

  return (
    <>
      <div className="space-y-4">
        <Link href={`/penggajian/${batchId}`} className="print:hidden">
          <Button variant="ghost" size="sm" className="gap-1.5 mb-4">
            <ArrowLeft className="size-4" /> Kembali ke Batch
          </Button>
        </Link>

        <div className="overflow-hidden rounded-lg border border-border print:border-0">
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-2.5 print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">{slip.id}</span>
              <Badge variant={locked ? "success" : "warning"}>
                {locked ? "Sudah Dibayar" : "Menunggu Pembayaran"}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {!locked && (
                <Button variant="outline" size="sm" onClick={() => setConfirmOpen(true)}>
                  Tandai Dibayar
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Download className="size-4" /> Unduh
              </Button>
            </div>
          </div>

          {/* Document preview */}
          <div className="p-4">
            <div className="mx-auto max-w-[794px]">
              <ScaleToFit>
                <SlipDocument slip={slip} periode={batch.periode} />
              </ScaleToFit>
            </div>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tandai sudah dibayar?</AlertDialogTitle>
            <AlertDialogDescription>
              Slip gaji <strong>{slip.karyawanNama}</strong> sebesar{" "}
              <strong>{formatRupiah(penggajianBersih)}</strong> akan ditandai sudah dibayar. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={markDibayar.isPending}
              onClick={() => {
                markDibayar.mutate({ batchId, slipId }, {
                  onSuccess: () => {
                    toast.success("Slip ditandai sudah dibayar.");
                    setConfirmOpen(false);
                  },
                });
              }}
            >
              Tandai Dibayar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
