"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { CalendarIcon, Download, Send, Plus, Ban, CheckCircle2, Pencil, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScaleToFit } from "@/components/shared/scale-to-fit";
import { DocumentFooter } from "@/components/shared/document/document-footer";
import { KirimDokumenDialog, type KirimTujuan } from "@/components/shared/document/kirim-dokumen-dialog";
import { FakturDocument } from "@/components/faktur/faktur-document";
import { cn } from "@/lib/utils";
import { formatRupiah, formatTanggalPanjang } from "@/lib/format";
import { useGenerateTermin, useUpdateTermin } from "@/lib/query/faktur";
import { useWorkflowStatuses } from "@/lib/query/proyek";
import { useOptionList } from "@/lib/query/daftar-pilihan";
import { usePerusahaanList } from "@/lib/query/perusahaan";
import { useSession } from "@/lib/query/session";
import { isClientPortal } from "@/lib/auth/rbac";
import type { FakturInduk, InvoiceTermin } from "@/lib/schemas/faktur";

export function statusVariant(systemRole: string | null): "info" | "warning" | "success" | "secondary" | "destructive" {
  if (systemRole === "LUNAS") return "success";
  if (systemRole === "BATAL") return "secondary";
  return "warning";
}

function tanggalID(iso: string | null) {
  return iso ? new Date(iso + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "—";
}

function todayISO() { return new Date().toISOString().slice(0, 10); }
function plusDaysISO(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = React.useState(false);
  const date = value ? new Date(value + "T00:00:00") : undefined;
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" className={cn("w-full justify-start font-normal", !date && "text-muted-foreground")}>
            <CalendarIcon />
            {date ? format(date, "dd MMMM yyyy", { locale: idLocale }) : "Pilih tanggal"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={date} locale={idLocale} autoFocus
            onSelect={(d) => { onChange(d ? format(d, "yyyy-MM-dd") : ""); setOpen(false); }} />
        </PopoverContent>
      </Popover>
    </Field>
  );
}

function tujuanOptionsFor(perusahaanOptions: { id: string; pic: { nama: string; jabatan: string; telepon: string; email: string }[] }[], perusahaanId: string): KirimTujuan[] {
  const p = perusahaanOptions.find((x) => x.id === perusahaanId);
  return p ? p.pic.map((pic) => ({ nama: pic.nama, jabatan: pic.jabatan, telepon: pic.telepon, email: pic.email })) : [];
}

// ─── Generate next termin dialog ─────────────────────────────────────────────

function GenerateTerminDialog({ induk, nextTerm, open, onOpenChange }: {
  induk: FakturInduk;
  nextTerm: { label: string; persen: number };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const generateTermin = useGenerateTermin();
  const { data: bankOptions = [] } = useOptionList("rekening_bank");
  const [tanggal, setTanggal] = React.useState(todayISO());
  const [jatuhTempo, setJatuhTempo] = React.useState(plusDaysISO(14));
  const [bankAccountId, setBankAccountId] = React.useState<string>("");
  const [catatan, setCatatan] = React.useState("");

  React.useEffect(() => {
    if (open) { setTanggal(todayISO()); setJatuhTempo(plusDaysISO(14)); setBankAccountId(""); setCatatan(""); }
  }, [open]);

  const nilai = (nextTerm.persen / 100) * induk.totalBiaya;

  const onSubmit = async () => {
    await generateTermin.mutateAsync({
      masterInvoiceId: induk.id,
      input: { tanggal, jatuhTempo, bankAccountId: bankAccountId || undefined, catatan: catatan || undefined },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Buat {nextTerm.label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {nextTerm.label} — {nextTerm.persen}% dari total biaya = <span className="font-mono">{formatRupiah(nilai)}</span>
          </p>
          <div className="grid grid-cols-2 gap-4">
            <DateField label="Tanggal" value={tanggal} onChange={setTanggal} />
            <DateField label="Jatuh Tempo" value={jatuhTempo} onChange={setJatuhTempo} />
          </div>
          <Field>
            <FieldLabel>Rekening Bank</FieldLabel>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Pilih rekening…" /></SelectTrigger>
              <SelectContent>
                {bankOptions.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.nama}{b.extra.bank ? ` — ${b.extra.bank.nomor}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel>Catatan</FieldLabel>
            <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan (opsional)" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button loading={generateTermin.isPending} onClick={onSubmit}>Buat Invoice Termin</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Termin document dialog ──────────────────────────────────────────────────

function TerminDocumentDialog({ induk, termin, open, onOpenChange }: {
  induk: FakturInduk; termin: InvoiceTermin; open: boolean; onOpenChange: (open: boolean) => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [kirimOpen, setKirimOpen] = React.useState(false);
  const { data: perusahaanOptions = [] } = usePerusahaanList();
  const { data: session } = useSession();
  const isClient = isClientPortal(session);
  React.useEffect(() => setMounted(true), []);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent showCloseButton={false} className="flex h-[80vh] w-[80vw] flex-col overflow-hidden p-0 max-w-[80vw]!">
          <DialogTitle className="sr-only">{termin.label} — {termin.number ?? "Belum bernomor"}</DialogTitle>
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-background px-4 py-3">
            <span className="font-semibold">{termin.label} — {termin.number ?? "Belum bernomor"}</span>
            <span className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Download className="size-4" /> Unduh
              </Button>
              {/* Kirim — not for the client portal, they're the recipient, not the sender. */}
              {!isClient && (
                <Button size="sm" onClick={() => setKirimOpen(true)}>
                  <Send className="size-4" /> Kirim
                </Button>
              )}
              <Button variant="ghost" size="icon" aria-label="Tutup" onClick={() => onOpenChange(false)}>
                <X className="size-4" />
              </Button>
            </span>
          </div>
          <div className="flex-1 overflow-y-auto bg-muted/40 p-4 sm:p-6">
            <div className="mx-auto max-w-[210mm]">
              <ScaleToFit>
                <FakturDocument induk={induk} termin={termin} />
              </ScaleToFit>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <KirimDokumenDialog
        open={kirimOpen}
        onOpenChange={setKirimOpen}
        jenisDokumen="faktur"
        dokumenId={termin.id}
        dokumenNomor={termin.number ?? termin.label}
        tujuanOptions={tujuanOptionsFor(perusahaanOptions, induk.perusahaanId)}
        tokens={{
          nama_perusahaan: perusahaanOptions.find((p) => p.id === induk.perusahaanId)?.nama ?? "",
          jatuh_tempo: formatTanggalPanjang(termin.jatuhTempo),
        }}
      />

      {mounted && createPortal(
        <div className="doc-print hidden print:block">
          <FakturDocument induk={induk} termin={termin} />
          <div className="doc-print-footer" aria-hidden><DocumentFooter /></div>
        </div>,
        document.body,
      )}
    </>
  );
}

// ─── Termin row ───────────────────────────────────────────────────────────────

function TerminRow({ induk, termin, batalStatusId, lunasStatusId }: {
  induk: FakturInduk; termin: InvoiceTermin; batalStatusId?: string; lunasStatusId?: string;
}) {
  const updateTermin = useUpdateTermin();
  const [docOpen, setDocOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const isFinal = termin.statusSystemRole === "LUNAS" || termin.statusSystemRole === "BATAL";
  const { data: session } = useSession();
  const isClient = isClientPortal(session);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
      <div className="w-32 font-medium">{termin.label}</div>
      <div className="w-40 font-mono text-xs text-muted-foreground">{termin.number ?? "—"}</div>
      <div className="w-32 text-muted-foreground">{tanggalID(termin.tanggal)}</div>
      <div className="w-40 font-mono tabular-nums">{formatRupiah(termin.totalSetelahPajak)}</div>
      <Badge variant={statusVariant(termin.statusSystemRole)}>{termin.status}</Badge>
      <div className="ml-auto flex items-center gap-2">
        <Button size="xs" variant="outline" onClick={() => setDocOpen(true)}>Lihat Dokumen</Button>
        {!isClient && !isFinal && (lunasStatusId || batalStatusId) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="xs" variant="outline">Aksi</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {lunasStatusId && (
                <DropdownMenuItem onSelect={() => updateTermin.mutate({ masterInvoiceId: induk.id, terminId: termin.id, input: { statusId: lunasStatusId, paidDate: todayISO() } })}>
                  <CheckCircle2 className="size-3.5" /> Tandai Lunas
                </DropdownMenuItem>
              )}
              {batalStatusId && (
                <DropdownMenuItem variant="destructive" onSelect={() => setCancelOpen(true)}>
                  <Ban className="size-3.5" /> Batalkan
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <TerminDocumentDialog induk={induk} termin={termin} open={docOpen} onOpenChange={setDocOpen} />

      <AlertDialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Batalkan {termin.label}?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Kembali</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={updateTermin.isPending}
              onClick={() => {
                if (!batalStatusId) return;
                updateTermin.mutate(
                  { masterInvoiceId: induk.id, terminId: termin.id, input: { statusId: batalStatusId } },
                  { onSuccess: () => setCancelOpen(false) },
                );
              }}
            >
              Ya, Batalkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Public entry point ───────────────────────────────────────────────────────

export function FakturIndukDetail({ induk }: { induk: FakturInduk }) {
  const router = useRouter();
  const { data: statusOptions = [] } = useWorkflowStatuses("faktur");
  const lunasStatusId = statusOptions.find((s) => s.systemRole === "LUNAS")?.id;
  const batalStatusId = statusOptions.find((s) => s.systemRole === "BATAL")?.id;
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const { data: session } = useSession();
  const isClient = isClientPortal(session);

  const nextTerm = induk.terminScheme[induk.termins.length];
  const isIndukFinal = induk.statusSystemRole === "LUNAS" || induk.statusSystemRole === "BATAL";

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-border">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border bg-muted/30 p-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-muted-foreground">{induk.number ?? "—"}</span>
              <span className="font-semibold">{induk.proyekNama}</span>
              <Badge variant={statusVariant(induk.statusSystemRole)}>{induk.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{induk.perusahaanNama}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="font-mono text-lg tabular-nums">{formatRupiah(induk.totalBiaya)}</p>
              <p className="text-xs text-muted-foreground">Total Biaya</p>
            </div>
            {!isClient && !isIndukFinal && (
              <Button variant="outline" size="sm" onClick={() => router.push(`/faktur/${encodeURIComponent(induk.id)}/edit`)}>
                <Pencil className="size-4" /> Edit
              </Button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1 p-4">
          {induk.layanan.map((l, i) => (
            <Badge key={l.serviceId ?? i} variant="secondary" className="text-xs">{l.nama}</Badge>
          ))}
        </div>
        {induk.notes && <p className="px-4 pb-4 text-sm text-muted-foreground">{induk.notes}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Skema Termin</h2>
        </div>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="divide-y divide-border">
            {induk.terminScheme.map((t, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-2 text-sm">
                <span className="w-32 font-medium">{t.label}</span>
                <span className="w-16 text-muted-foreground">{t.persen}%</span>
                <span className="font-mono tabular-nums text-muted-foreground">{formatRupiah((t.persen / 100) * induk.totalBiaya)}</span>
                <span className="ml-auto">
                  <Badge variant={i < induk.termins.length ? "success" : "secondary"} className="text-xs">
                    {i < induk.termins.length ? "Sudah dibuat" : "Belum dibuat"}
                  </Badge>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground">Invoice Termin</h2>
          {!isClient && nextTerm && !isIndukFinal && (
            <Button size="sm" onClick={() => setGenerateOpen(true)}>
              <Plus className="size-4" /> Buat {nextTerm.label}
            </Button>
          )}
        </div>
        {induk.termins.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Belum ada Invoice Termin dibuat.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="divide-y divide-border">
              {induk.termins.map((t) => (
                <TerminRow key={t.id} induk={induk} termin={t} lunasStatusId={lunasStatusId} batalStatusId={batalStatusId} />
              ))}
            </div>
          </div>
        )}
      </div>

      {nextTerm && (
        <GenerateTerminDialog induk={induk} nextTerm={nextTerm} open={generateOpen} onOpenChange={setGenerateOpen} />
      )}
    </div>
  );
}
