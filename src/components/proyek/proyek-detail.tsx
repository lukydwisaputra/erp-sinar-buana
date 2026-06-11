"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FolderKanban, Building2, MapPin, CalendarDays, Banknote, ExternalLink, Clock, ChevronUp, ChevronDown, Trash2, Plus, LayoutList } from "lucide-react";
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
import { useUpdateProyekStatus, useProyekLog, useUpdateMilestone, useMoveMilestone, useAddMilestone, useDeleteMilestone, useReplaceMilestonesWithTemplate } from "@/lib/query/proyek";
import { getMilestoneTemplate } from "@/lib/data/proyek";
import { karyawanFixtures } from "@/lib/fixtures/karyawan";
import type { Proyek, ProyekStatus, Milestone, MilestoneStatus } from "@/lib/schemas/proyek";

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

const MILESTONE_STATUS_OPTIONS: { value: MilestoneStatus; label: string }[] = [
  { value: "belum_mulai", label: "Belum Mulai" },
  { value: "on_track",    label: "On Track" },
  { value: "terlambat",   label: "Terlambat" },
  { value: "selesai",     label: "Selesai" },
];

const MILESTONE_STATUS_STYLE: Record<MilestoneStatus, string> = {
  belum_mulai: "text-muted-foreground",
  on_track:    "text-blue-600 dark:text-blue-400",
  terlambat:   "text-amber-600 dark:text-amber-400",
  selesai:     "text-green-600 dark:text-green-400",
};

const activeKaryawan = karyawanFixtures.filter((k) => k.status === "aktif");

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function tanggalID(iso: string) {
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function MilestoneRow({
  m, proyekId, isFirst, isLast, autoFocus,
}: {
  m: Milestone;
  proyekId: string;
  isFirst: boolean;
  isLast: boolean;
  autoFocus?: boolean;
}) {
  const updateMilestone = useUpdateMilestone();
  const moveMilestone   = useMoveMilestone();
  const deleteMilestone = useDeleteMilestone();

  const [nama, setNama]         = React.useState(m.nama);
  const [targetDate, setTarget] = React.useState(m.targetDate ?? "");
  const [actualDate, setActual] = React.useState(m.actualDate ?? "");
  const namaRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { setNama(m.nama); }, [m.nama]);
  React.useEffect(() => { setTarget(m.targetDate ?? ""); }, [m.targetDate]);
  React.useEffect(() => { setActual(m.actualDate ?? ""); }, [m.actualDate]);
  React.useEffect(() => { if (autoFocus) namaRef.current?.focus(); }, [autoFocus]);

  const save = (patch: Partial<Omit<Milestone, "id" | "urutan">>) =>
    updateMilestone.mutate({ proyekId, milestoneId: m.id, patch });

  const inputCls = "w-full rounded px-1.5 py-0.5 text-sm bg-transparent outline-none ring-inset focus:ring-1 focus:ring-ring hover:bg-muted/50 transition-colors";

  return (
    <div
      className="grid items-center gap-2 border-b border-border px-2 py-1.5 last:border-0"
      style={{ gridTemplateColumns: "24px 1fr 130px 110px 110px 110px 80px 28px" }}
    >
      {/* Reorder */}
      <div className="flex flex-col gap-0">
        <button
          type="button"
          disabled={isFirst || moveMilestone.isPending}
          onClick={() => moveMilestone.mutate({ proyekId, milestoneId: m.id, direction: "up" })}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <ChevronUp className="size-3" />
        </button>
        <button
          type="button"
          disabled={isLast || moveMilestone.isPending}
          onClick={() => moveMilestone.mutate({ proyekId, milestoneId: m.id, direction: "down" })}
          className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
        >
          <ChevronDown className="size-3" />
        </button>
      </div>

      {/* Nama */}
      <input
        ref={namaRef}
        className={inputCls}
        value={nama}
        placeholder="Nama milestone…"
        onChange={(e) => setNama(e.target.value)}
        onBlur={() => { if (nama !== m.nama) save({ nama }); }}
      />

      {/* Assignee */}
      <select
        className={`${inputCls} cursor-pointer`}
        value={m.assigneeNama ?? ""}
        onChange={(e) => save({ assigneeNama: e.target.value || null })}
      >
        <option value="">—</option>
        {activeKaryawan.map((k) => (
          <option key={k.id} value={k.nama}>{k.nama}</option>
        ))}
      </select>

      {/* Target Date */}
      <input
        type="date"
        className={inputCls}
        value={targetDate}
        onChange={(e) => setTarget(e.target.value)}
        onBlur={() => {
          const val = targetDate || null;
          if (val !== m.targetDate) save({ targetDate: val });
        }}
      />

      {/* Actual Date */}
      <input
        type="date"
        className={inputCls}
        value={actualDate}
        onChange={(e) => setActual(e.target.value)}
        onBlur={() => {
          const val = actualDate || null;
          if (val !== m.actualDate) save({ actualDate: val });
        }}
      />

      {/* Status */}
      <select
        className={`${inputCls} cursor-pointer font-medium ${MILESTONE_STATUS_STYLE[m.status]}`}
        value={m.status}
        onChange={(e) => save({ status: e.target.value as MilestoneStatus })}
      >
        {MILESTONE_STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      {/* Tagih Termin badge */}
      <div className="flex items-center">
        {m.status === "selesai" && m.pemicuTermin && (
          <Link href={`/faktur/${encodeURIComponent(m.pemicuTermin.fakturId)}`}>
            <Badge variant="warning" className="cursor-pointer text-xs whitespace-nowrap">
              Tagih {m.pemicuTermin.persen}%
            </Badge>
          </Link>
        )}
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => {
          deleteMilestone.mutate({ proyekId, milestoneId: m.id }, {
            onSuccess: () => toast.success("Milestone dihapus."),
          });
        }}
        className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors"
        aria-label="Hapus milestone"
      >
        <Trash2 className="size-3.5" />
      </button>
    </div>
  );
}

function MilestoneTab({ proyek }: { proyek: Proyek }) {
  const addMilestone    = useAddMilestone();
  const replaceTemplate = useReplaceMilestonesWithTemplate();
  const [newId, setNewId]                   = React.useState<string | null>(null);
  const [templateConfirm, setTemplateConfirm] = React.useState(false);

  const sorted   = [...proyek.milestones].sort((a, b) => a.urutan - b.urutan);
  const template = getMilestoneTemplate(proyek.layananNama);

  const handleAddMilestone = () => {
    const id = `ML-${Date.now()}`;
    const maxUrutan = sorted.length > 0 ? Math.max(...sorted.map((m) => m.urutan)) : 0;
    addMilestone.mutate(
      {
        proyekId: proyek.id,
        milestone: {
          id, nama: "", urutan: maxUrutan + 1,
          assigneeNama: null, targetDate: null, actualDate: null,
          status: "belum_mulai", pemicuTermin: null,
        },
      },
      { onSuccess: () => setNewId(id) },
    );
  };

  const handleLoadTemplate = () => {
    if (!template) return;
    replaceTemplate.mutate(
      { proyekId: proyek.id, templateMilestones: template.milestones },
      {
        onSuccess: () => {
          toast.success("Template milestone dimuat.");
          setTemplateConfirm(false);
        },
      },
    );
  };

  return (
    <div className="mt-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {template && (
            <Button variant="outline" size="sm" onClick={() => setTemplateConfirm(true)}>
              <LayoutList className="size-3.5 mr-1.5" /> Muat Template
            </Button>
          )}
        </div>
        <Button size="sm" onClick={handleAddMilestone} disabled={addMilestone.isPending}>
          <Plus className="size-3.5 mr-1.5" /> Tambah Milestone
        </Button>
      </div>

      {sorted.length > 0 && (
        <div
          className="grid items-center gap-2 px-2 pb-1 text-xs font-medium text-muted-foreground"
          style={{ gridTemplateColumns: "24px 1fr 130px 110px 110px 110px 80px 28px" }}
        >
          <span /><span>Nama</span><span>Assignee</span><span>Target</span>
          <span>Aktual</span><span>Status</span><span /><span />
        </div>
      )}

      <div className="rounded-lg border border-border">
        {sorted.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-muted-foreground">
            Belum ada milestone. Tambah atau muat template.
          </p>
        ) : (
          sorted.map((m, i) => (
            <MilestoneRow
              key={m.id}
              m={m}
              proyekId={proyek.id}
              isFirst={i === 0}
              isLast={i === sorted.length - 1}
              autoFocus={m.id === newId}
            />
          ))
        )}
      </div>

      <AlertDialog open={templateConfirm} onOpenChange={setTemplateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Muat template milestone?</AlertDialogTitle>
            <AlertDialogDescription>
              Muat template dari &ldquo;{template?.templateName}&rdquo;? Milestone yang ada akan digantikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={replaceTemplate.isPending}
              onClick={handleLoadTemplate}
            >
              Muat Template
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
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
          <MilestoneTab proyek={proyek} />
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
