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
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import { calcSlip, type PenggajianBatch, type SlipGaji } from "@/lib/schemas/penggajian";
import { useBatch, useUpdateSlip, useMarkSlipDibayar } from "@/lib/query/penggajian";

function periodStr(p: PenggajianBatch["periode"]) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
  return `${fmt(p.mulai)} – ${fmt(p.selesai)}`;
}

const colGrid = "160px 100px 90px 80px 80px 90px 90px 110px 110px 130px 80px";
const inputCls =
  "w-full rounded px-1.5 py-0.5 text-right text-sm font-mono bg-transparent outline-none ring-inset focus:ring-1 focus:ring-ring hover:bg-muted/50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

function SlipRow({ slip, batchId }: { slip: SlipGaji; batchId: string }) {
  const updateSlip = useUpdateSlip();
  const markDibayar = useMarkSlipDibayar();
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const locked = slip.status === "sudah_dibayar";

  const [tunjangan, setTunjangan] = React.useState(String(slip.tunjangan));
  const [lembur, setLembur]       = React.useState(String(slip.lembur));
  const [bonus, setBonus]         = React.useState(String(slip.bonus));
  const [pph21, setPph21]         = React.useState(String(slip.pph21));
  const [bpjs, setBpjs]           = React.useState(String(slip.bpjsPotongan));

  React.useEffect(() => { setTunjangan(String(slip.tunjangan)); }, [slip.tunjangan]);
  React.useEffect(() => { setLembur(String(slip.lembur)); }, [slip.lembur]);
  React.useEffect(() => { setBonus(String(slip.bonus)); }, [slip.bonus]);
  React.useEffect(() => { setPph21(String(slip.pph21)); }, [slip.pph21]);
  React.useEffect(() => { setBpjs(String(slip.bpjsPotongan)); }, [slip.bpjsPotongan]);

  const save = (patch: Parameters<typeof updateSlip.mutate>[0]["patch"]) =>
    updateSlip.mutate({ batchId, slipId: slip.id, patch });

  const toNum = (s: string) => Math.max(0, Number(s) || 0);
  const localSlip = {
    ...slip,
    tunjangan: toNum(tunjangan),
    lembur: toNum(lembur),
    bonus: toNum(bonus),
    pph21: toNum(pph21),
    bpjsPotongan: toNum(bpjs),
  };
  const { gajiPokokEfektif, penggajianKotor, penggajianBersih } = calcSlip(localSlip);

  const numField = (
    val: string,
    setVal: (v: string) => void,
    field: keyof typeof localSlip & ("tunjangan" | "lembur" | "bonus" | "pph21" | "bpjsPotongan"),
    original: number,
  ) => (
    <input
      type="number" min={0} disabled={locked}
      value={val}
      placeholder="0"
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => {
        const v = toNum(val);
        if (v !== original) save({ [field]: v });
      }}
      className={inputCls}
    />
  );

  return (
    <>
      <div
        className="grid items-center gap-1 border-b border-border px-2 py-2 last:border-0"
        style={{ gridTemplateColumns: colGrid }}
      >
        <div>
          <p className="text-sm font-medium truncate">{slip.karyawanNama}</p>
          <p className="text-xs text-muted-foreground truncate">{slip.jabatan}</p>
        </div>
        <span className="text-right text-sm font-mono tabular-nums">{formatRupiahCompact(gajiPokokEfektif)}</span>
        {numField(tunjangan, setTunjangan, "tunjangan", slip.tunjangan)}
        {numField(lembur, setLembur, "lembur", slip.lembur)}
        {numField(bonus, setBonus, "bonus", slip.bonus)}
        {numField(pph21, setPph21, "pph21", slip.pph21)}
        {numField(bpjs, setBpjs, "bpjsPotongan", slip.bpjsPotongan)}
        <span className="text-right text-sm font-mono tabular-nums">{formatRupiahCompact(penggajianKotor)}</span>
        <span className={`text-right text-sm font-mono tabular-nums font-semibold ${penggajianBersih < 0 ? "text-destructive" : ""}`}>
          {formatRupiahCompact(penggajianBersih)}
        </span>
        <div className="flex items-center justify-center">
          {locked
            ? <Badge variant="success" className="text-xs">Dibayar</Badge>
            : <Badge variant="warning" className="text-xs">Menunggu</Badge>}
        </div>
        <div className="flex items-center gap-1">
          <Link href={`/penggajian/${batchId}/${slip.id}`}>
            <Button variant="ghost" size="sm" className="h-6 px-1.5 text-xs gap-1">
              <ExternalLink className="size-3" /> Slip
            </Button>
          </Link>
          {!locked && (
            <Button variant="outline" size="sm" className="h-6 px-1.5 text-xs"
              onClick={() => setConfirmOpen(true)}>
              Bayar
            </Button>
          )}
        </div>
      </div>

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
        <div
          className="grid items-center gap-1 px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground"
          style={{ gridTemplateColumns: colGrid }}
        >
          <span>Nama</span>
          <span className="text-right">Gaji Efektif</span>
          <span className="text-right">Tunjangan</span>
          <span className="text-right">Lembur</span>
          <span className="text-right">Bonus</span>
          <span className="text-right">PPh 21</span>
          <span className="text-right">BPJS</span>
          <span className="text-right">Kotor</span>
          <span className="text-right">Bersih</span>
          <span className="text-center">Status</span>
          <span />
        </div>
        <div>
          {batch.slips.map((slip) => (
            <SlipRow key={slip.id} slip={slip} batchId={batch.id} />
          ))}
        </div>
      </div>
    </div>
  );
}
