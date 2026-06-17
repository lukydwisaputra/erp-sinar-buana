"use client";
import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Wallet, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatRupiah, formatIntIDR, parseRupiah } from "@/lib/format";
import { calcSlip, type PenggajianBatch, type SlipGaji } from "@/lib/schemas/penggajian";
import { useBatch, useUpdateSlip, useMarkSlipDibayar } from "@/lib/query/penggajian";

function periodStr(p: PenggajianBatch["periode"]) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  return `${fmt(p.mulai)} – ${fmt(p.selesai)}`;
}

const inputCls =
  "w-full rounded px-1 py-0.5 text-right text-xs font-mono bg-transparent outline-none ring-inset focus:ring-1 focus:ring-ring hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

function InlineMoneyCell({
  value, disabled, onSave,
}: {
  value: number; disabled: boolean; onSave: (v: number) => void;
}) {
  const [focused, setFocused] = React.useState(false);
  const [text, setText] = React.useState(value ? formatIntIDR(value) : "");

  React.useEffect(() => {
    if (!focused) setText(value ? formatIntIDR(value) : "");
  }, [value, focused]);

  return (
    <div className="flex items-center gap-0.5">
      <span className="text-[10px] text-muted-foreground shrink-0">Rp</span>
      <input
        inputMode="numeric"
        disabled={disabled}
        value={focused ? text : (value ? formatIntIDR(value) : "")}
        placeholder="0"
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setText(e.target.value);
        }}
        onBlur={() => {
          setFocused(false);
          const v = parseRupiah(text);
          setText(v ? formatIntIDR(v) : "");
          if (v !== value) onSave(v);
        }}
        className={inputCls}
      />
    </div>
  );
}

function SlipRow({ slip, batchId }: { slip: SlipGaji; batchId: string }) {
  const updateSlip = useUpdateSlip();
  const markDibayar = useMarkSlipDibayar();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const locked = slip.status === "sudah_dibayar";
  const { gajiPokokEfektif, penggajianKotor, penggajianBersih } = calcSlip(slip);

  const save = (patch: Parameters<typeof updateSlip.mutate>[0]["patch"]) =>
    updateSlip.mutate({ batchId, slipId: slip.id, patch });

  const rc = "px-1 py-1.5 text-right font-mono tabular-nums whitespace-nowrap";

  return (
    <>
      <tr className="border-b border-border last:border-0 divide-x divide-border">
        <td className="px-2 py-1.5">
          <p className="font-medium truncate">{slip.karyawanNama}</p>
          <p className="text-[10px] text-muted-foreground truncate">{slip.jabatan}</p>
        </td>
        <td className={rc}>{formatRupiah(gajiPokokEfektif)}</td>
        <td className="px-1 py-1"><InlineMoneyCell value={slip.tunjangan} disabled={locked} onSave={(v) => save({ tunjangan: v })} /></td>
        <td className="px-1 py-1"><InlineMoneyCell value={slip.lembur} disabled={locked} onSave={(v) => save({ lembur: v })} /></td>
        <td className="px-1 py-1"><InlineMoneyCell value={slip.bonus} disabled={locked} onSave={(v) => save({ bonus: v })} /></td>
        <td className="px-1 py-1"><InlineMoneyCell value={slip.pph21} disabled={locked} onSave={(v) => save({ pph21: v })} /></td>
        <td className="px-1 py-1"><InlineMoneyCell value={slip.bpjsPotongan} disabled={locked} onSave={(v) => save({ bpjsPotongan: v })} /></td>
        <td className={rc}>{formatRupiah(penggajianKotor)}</td>
        <td className={`${rc} font-semibold ${penggajianBersih < 0 ? "text-destructive" : ""}`}>
          {formatRupiah(penggajianBersih)}
        </td>
        <td className="px-1 py-1.5 text-center">
          {locked
            ? <Badge variant="success" className="text-[10px]">Dibayar</Badge>
            : <Badge variant="warning" className="text-[10px]">Menunggu</Badge>}
        </td>
        <td className="px-1 py-1.5">
          <div className="flex items-center gap-0.5 justify-end">
            <Link href={`/penggajian/${batchId}/${slip.id}`}>
              <Button variant="ghost" size="sm" className="h-5 px-1 text-[10px] gap-0.5">
                <ExternalLink className="size-2.5" /> Slip
              </Button>
            </Link>
            {!locked && (
              <Button variant="outline" size="sm" className="h-5 px-1 text-[10px]"
                onClick={() => setConfirmOpen(true)}>
                Bayar
              </Button>
            )}
          </div>
        </td>
      </tr>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
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
              onClick={() => {
                markDibayar.mutate({ batchId, slipId: slip.id }, {
                  onSuccess: () => {
                    toast.success(`${slip.karyawanNama} — slip ditandai sudah dibayar.`);
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

function TotalsRow({ slips }: { slips: SlipGaji[] }) {
  const totals = slips.reduce((acc, slip) => {
    const { gajiPokokEfektif, penggajianKotor, penggajianBersih } = calcSlip(slip);
    return {
      gajiEfektif: acc.gajiEfektif + gajiPokokEfektif,
      tunjangan: acc.tunjangan + slip.tunjangan,
      lembur: acc.lembur + slip.lembur,
      bonus: acc.bonus + slip.bonus,
      pph21: acc.pph21 + slip.pph21,
      bpjs: acc.bpjs + slip.bpjsPotongan,
      kotor: acc.kotor + penggajianKotor,
      bersih: acc.bersih + penggajianBersih,
    };
  }, { gajiEfektif: 0, tunjangan: 0, lembur: 0, bonus: 0, pph21: 0, bpjs: 0, kotor: 0, bersih: 0 });

  const tc = "px-1 py-2 text-right font-mono tabular-nums whitespace-nowrap";

  return (
    <tr className="border-t-2 border-border bg-muted/50 font-semibold divide-x divide-border">
      <td className="px-2 py-2">Total</td>
      <td className={tc}>{formatRupiah(totals.gajiEfektif)}</td>
      <td className={tc}>{formatRupiah(totals.tunjangan)}</td>
      <td className={tc}>{formatRupiah(totals.lembur)}</td>
      <td className={tc}>{formatRupiah(totals.bonus)}</td>
      <td className={tc}>{formatRupiah(totals.pph21)}</td>
      <td className={tc}>{formatRupiah(totals.bpjs)}</td>
      <td className={tc}>{formatRupiah(totals.kotor)}</td>
      <td className={`${tc} ${totals.bersih < 0 ? "text-destructive" : ""}`}>{formatRupiah(totals.bersih)}</td>
      <td />
      <td />
    </tr>
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Wallet className="size-5 text-muted-foreground" />
            <h1 className="text-xl font-semibold tracking-tight">{batch.id}</h1>
            <Badge variant={paid === total ? "success" : paid > 0 ? "warning" : "secondary"}>
              {paid}/{total} Dibayar
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground pl-7">{periodStr(batch.periode)}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full table-fixed text-xs">
          <colgroup>
            {/* Nama  GajiEf  Tunj   Lembur Bonus  PPh21  BPJS   Kotor  Bersih Status Actions = 100% */}
            <col style={{ width: "13%" }} />
            <col style={{ width: "10%" }} />
            <col style={{ width: "9%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "8%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "11%" }} />
            <col style={{ width: "7%" }} />
            <col style={{ width: "7%" }} />
          </colgroup>
          <thead>
            <tr className="border-b border-border bg-muted/50 text-xs font-medium text-muted-foreground uppercase divide-x divide-border">
              <th className="px-2 py-2 text-left">Nama</th>
              <th className="px-2 py-2 text-right">Gaji Efektif</th>
              <th className="px-2 py-2 text-right">Tunjangan</th>
              <th className="px-2 py-2 text-right">Lembur</th>
              <th className="px-2 py-2 text-right">Bonus</th>
              <th className="px-2 py-2 text-right">PPh 21</th>
              <th className="px-2 py-2 text-right">BPJS</th>
              <th className="px-2 py-2 text-right">Kotor</th>
              <th className="px-2 py-2 text-right">Bersih</th>
              <th className="px-2 py-2 text-center">Status</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {batch.slips.map((slip) => (
              <SlipRow key={slip.id} slip={slip} batchId={batch.id} />
            ))}
          </tbody>
          {batch.slips.length > 0 && (
            <tfoot>
              <TotalsRow slips={batch.slips} />
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
