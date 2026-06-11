"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderKanban, Building2, MapPin, CalendarDays, Banknote, ExternalLink, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InfoRow, InfoList } from "@/components/shared/detail-drawer";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import { useUpdateProyekStatus, useProyekLog } from "@/lib/query/proyek";
import type { Proyek, ProyekStatus } from "@/lib/schemas/proyek";

const STATUS: Record<ProyekStatus, { label: string; variant: "info" | "warning" | "success" | "destructive" | "secondary" }> = {
  po_kontrak:        { label: "PO/Kontrak",         variant: "info" },
  collecting_data:   { label: "Pengumpulan Data",    variant: "info" },
  drafting:          { label: "Penyusunan",          variant: "warning" },
  tunggu_pengesahan: { label: "Tunggu Pengesahan",   variant: "warning" },
  pending:           { label: "Pending",             variant: "secondary" },
  selesai:           { label: "Selesai",             variant: "success" },
  batal:             { label: "Batal",               variant: "destructive" },
};

const TRANSITIONS: Record<ProyekStatus, ProyekStatus[]> = {
  po_kontrak:        ["collecting_data", "batal"],
  collecting_data:   ["drafting", "batal"],
  drafting:          ["tunggu_pengesahan", "batal"],
  tunggu_pengesahan: ["pending", "selesai"],
  pending:           ["drafting", "selesai"],
  selesai:           [],
  batal:             [],
};

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function tanggalID(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function InfoTab({ proyek }: { proyek: Proyek }) {
  return (
    <div className="mt-4 max-w-lg">
      <InfoList>
        <InfoRow label="Perusahaan" value={proyek.perusahaanNama} />
        <InfoRow label="Area" value={proyek.area} />
        <InfoRow label="Tahun" value={String(proyek.tahun)} />
        <InfoRow
          label="Layanan"
          value={
            <div className="flex flex-wrap gap-1">
              {proyek.layananNama.map((n) => <Badge key={n} variant="info" className="text-xs">{n}</Badge>)}
            </div>
          }
        />
        <InfoRow
          label="Nilai Kontrak"
          value={<span className="font-mono tabular-nums">{formatRupiah(proyek.nilaiKontrak)}</span>}
        />
        {proyek.sphId && (
          <InfoRow
            label="SPH"
            value={
              <Link
                href={`/penawaran/${encodeURIComponent(proyek.sphId)}`}
                className="inline-flex items-center gap-1 font-mono text-primary hover:underline"
              >
                {proyek.sphId} <ExternalLink className="size-3" />
              </Link>
            }
          />
        )}
        <InfoRow label="Dibuat" value={tanggalID(proyek.createdAt)} />
      </InfoList>
    </div>
  );
}

function LogTab({ proyekId }: { proyekId: string }) {
  const { data: log = [], isLoading } = useProyekLog(proyekId);
  const sorted = [...log].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );

  if (isLoading) return <p className="mt-4 text-sm text-muted-foreground">Memuat log…</p>;
  if (sorted.length === 0) {
    return <p className="mt-4 text-sm text-muted-foreground">Belum ada aktivitas.</p>;
  }

  return (
    <ul className="mt-4 space-y-3">
      {sorted.map((entry) => (
        <li key={entry.id} className="flex items-start gap-3">
          <Clock className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <div>
            <p className="text-sm">{entry.description}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(entry.timestamp).toLocaleString("id-ID")}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

export function ProyekDetail({ proyek }: { proyek: Proyek }) {
  const router = useRouter();
  const updateStatus = useUpdateProyekStatus();
  const [statusTarget, setStatusTarget] = React.useState<ProyekStatus | null>(null);
  const nextStatuses = TRANSITIONS[proyek.status];

  const handleConfirmStatus = () => {
    if (!statusTarget) return;
    updateStatus.mutate(
      { id: proyek.id, status: statusTarget },
      {
        onSuccess: () => {
          toast.success(`Status diubah: ${STATUS[statusTarget].label}`);
          setStatusTarget(null);
          router.refresh();
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <FolderKanban className="size-5 text-muted-foreground shrink-0" />
              <h1 className="text-xl font-semibold tracking-tight leading-tight">{proyek.nama}</h1>
              <Badge variant={STATUS[proyek.status].variant}>{STATUS[proyek.status].label}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Building2 className="size-3.5" />{proyek.perusahaanNama}</span>
              <span className="flex items-center gap-1"><MapPin className="size-3.5" />{proyek.area}</span>
              <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />{proyek.tahun}</span>
              <span className="flex items-center gap-1 font-mono tabular-nums" title={formatRupiah(proyek.nilaiKontrak)}>
                <Banknote className="size-3.5" />{formatRupiahCompact(proyek.nilaiKontrak)}
              </span>
            </div>
          </div>

          {nextStatuses.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">Ubah Status</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {nextStatuses.filter((s) => s !== "batal").map((s) => (
                  <DropdownMenuItem key={s} onSelect={() => setStatusTarget(s)}>
                    {STATUS[s].label}
                  </DropdownMenuItem>
                ))}
                {nextStatuses.includes("batal") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setStatusTarget("batal")}>
                      Batalkan Proyek
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {proyek.assignees.length > 0 && (
          <div className="flex items-center gap-1.5">
            {proyek.assignees.map((a) => (
              <Avatar key={a.karyawanId} className="size-7" title={a.nama}>
                <AvatarFallback className="text-[10px]">{initials(a.nama)}</AvatarFallback>
              </Avatar>
            ))}
            <span className="text-xs text-muted-foreground ml-1">
              {proyek.assignees.map((a) => a.nama).join(", ")}
            </span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="milestone">
        <TabsList>
          <TabsTrigger value="milestone">Milestone</TabsTrigger>
          <TabsTrigger value="info">Info Proyek</TabsTrigger>
          <TabsTrigger value="log">Log Aktivitas</TabsTrigger>
        </TabsList>
        <TabsContent value="milestone">
          <p className="mt-4 text-sm text-muted-foreground">Milestone — segera hadir.</p>
        </TabsContent>
        <TabsContent value="info">
          <InfoTab proyek={proyek} />
        </TabsContent>
        <TabsContent value="log">
          <LogTab proyekId={proyek.id} />
        </TabsContent>
      </Tabs>

      {/* Status confirm dialog */}
      <AlertDialog open={!!statusTarget} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusTarget === "batal" ? "Batalkan proyek ini?" : `Ubah status ke ${statusTarget ? STATUS[statusTarget].label : ""}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusTarget === "batal"
                ? "Status proyek akan berubah menjadi Batal. Tindakan ini tidak dapat dibatalkan."
                : "Status proyek akan diperbarui."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant={statusTarget === "batal" ? "destructive" : "default"}
              disabled={updateStatus.isPending}
              onClick={handleConfirmStatus}
            >
              {statusTarget === "batal" ? "Ya, Batalkan" : "Ubah Status"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
