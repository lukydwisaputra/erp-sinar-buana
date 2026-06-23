"use client";
import * as React from "react";
import { toast } from "sonner";
import {
  FolderKanban, Building2, MapPin, CalendarDays, Check,
  ChevronUp, ChevronDown, Trash2, Plus, CalendarIcon, CornerDownRight, ChevronDown as ChevronDownIcon,
} from "lucide-react";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useProyek, useUpdateProyekStatus,
  useUpdateMilestone, useMoveMilestone, useAddMilestone, useDeleteMilestone,
} from "@/lib/query/proyek";
import { karyawanFixtures } from "@/lib/fixtures/karyawan";
import { perusahaanFixtures } from "@/lib/fixtures/perusahaan";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Proyek, ProyekStatus, Milestone, MilestoneStatus } from "@/lib/schemas/proyek";
import { MilestoneModal } from "@/components/proyek/milestone-modal";
import { RealisasiRabForm } from "@/components/realisasi-rab/realisasi-rab-form";
import { useRealisasiRabByProyek } from "@/lib/query/realisasi-rab";
import { formatRupiah } from "@/lib/format";

const STATUS: Record<ProyekStatus, { label: string; variant: "info" | "warning" | "success" | "secondary" | "destructive" }> = {
  belum_mulai: { label: "Belum Mulai",     variant: "secondary" },
  on_track:    { label: "Sedang Berjalan", variant: "info" },
  terlambat:   { label: "Terlambat",       variant: "destructive" },
  selesai:     { label: "Selesai",         variant: "success" },
  dibatalkan:  { label: "Dibatalkan",      variant: "secondary" },
};

const TRANSITIONS: Record<ProyekStatus, ProyekStatus[]> = {
  belum_mulai: ["on_track"],
  on_track:    ["terlambat", "selesai"],
  terlambat:   ["on_track", "selesai"],
  selesai:     [],
  dibatalkan:  [],
};

const MILESTONE_STATUS: {
  value: MilestoneStatus;
  label: string;
  variant: "secondary" | "info" | "warning" | "success";
}[] = [
  { value: "belum_mulai", label: "Belum Mulai",     variant: "secondary" },
  { value: "on_track",    label: "Sedang Berjalan", variant: "info" },
  { value: "terlambat",   label: "Terlambat",       variant: "warning" },
  { value: "selesai",     label: "Selesai",         variant: "success" },
];

const MILESTONE_STATUS_MAP = Object.fromEntries(
  MILESTONE_STATUS.map((s) => [s.value, s]),
) as Record<MilestoneStatus, (typeof MILESTONE_STATUS)[0]>;

const COL = "20px 1fr 100px 110px 110px 140px 72px 28px";

type PersonOption = { id: string; nama: string; jabatan: string; group: "PIC" | "Karyawan" };

function buildPersonOptions(perusahaanId: string): PersonOption[] {
  const pics = (perusahaanFixtures.find((p) => p.id === perusahaanId)?.pic ?? []).map((p, i) => ({
    id: `PIC-${perusahaanId}-${i}`,
    nama: p.nama,
    jabatan: p.jabatan,
    group: "PIC" as const,
  }));
  const karyawan = karyawanFixtures
    .filter((k) => k.status === "aktif")
    .map((k) => ({ id: k.id, nama: k.nama, jabatan: k.jabatan, group: "Karyawan" as const }));
  return [...pics, ...karyawan];
}

function MilestoneAssigneeField({
  assignees,
  personOptions,
  onChange,
}: {
  assignees: { id: string; nama: string }[];
  personOptions: PersonOption[];
  onChange: (next: { id: string; nama: string }[]) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const selectedIds = new Set(assignees.map((a) => a.id));

  const filtered = q.trim()
    ? personOptions.filter((o) => o.nama.toLowerCase().includes(q.toLowerCase()) || o.jabatan.toLowerCase().includes(q.toLowerCase()))
    : personOptions;

  const toggle = (person: PersonOption) => {
    const next = selectedIds.has(person.id)
      ? assignees.filter((a) => a.id !== person.id)
      : [...assignees, { id: person.id, nama: person.nama }];
    onChange(next);
  };

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQ(""); }}>
        <div className="flex items-center gap-1">
          {assignees.length === 0 ? (
            <PopoverTrigger asChild>
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground transition-colors px-1">—</button>
            </PopoverTrigger>
          ) : (
            <div className="flex items-center gap-1">
              <div className="flex">
                {assignees.map((a, i) => {
                  const jabatan = personOptions.find((p) => p.id === a.id)?.jabatan;
                  return (
                    <Tooltip key={a.id}>
                      <TooltipTrigger asChild>
                        <Avatar className="size-6 ring-2 ring-background cursor-default" style={{ marginLeft: i === 0 ? 0 : "-7px" }}>
                          <AvatarFallback className="text-[9px]">{initials(a.nama)}</AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <span className="font-medium">{a.nama}</span>
                        {jabatan && <span className="text-background/60 ml-1">· {jabatan}</span>}
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
              <PopoverTrigger asChild>
                <button type="button" className="size-4 flex items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100">
                  <Plus className="size-2.5" />
                </button>
              </PopoverTrigger>
            </div>
          )}
        </div>
        <PopoverContent className="w-60 p-0" align="start" sideOffset={4}>
          <div className="p-2 border-b border-border">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama atau jabatan…"
              className="w-full rounded-md bg-muted/50 px-2 py-1.5 text-xs outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-ring"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {filtered.length === 0 && (
              <p className="py-4 text-center text-xs text-muted-foreground">Tidak ditemukan</p>
            )}
            {(["PIC", "Karyawan"] as const).map((group) => {
              const items = filtered.filter((o) => o.group === group);
              if (!items.length) return null;
              return (
                <div key={group}>
                  <p className="mt-1 mb-0.5 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">{group}</p>
                  {items.map((person) => (
                    <button key={person.id} type="button" onClick={() => toggle(person)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/60 transition-colors">
                      <Avatar className="size-6 shrink-0">
                        <AvatarFallback className="text-[9px]">{initials(person.nama)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs leading-tight">{person.nama}</p>
                        <p className="truncate text-[10px] text-muted-foreground leading-tight">{person.jabatan}</p>
                      </div>
                      {selectedIds.has(person.id) && <Check className="size-3 shrink-0 text-primary" />}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  );
}

function flattenTree(milestones: Milestone[]): Array<{ m: Milestone; depth: 0 | 1 | 2 }> {
  const byParent = new Map<string | null, Milestone[]>();
  for (const m of milestones) {
    const key = m.parentId ?? null;
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(m);
  }
  const sort = (arr: Milestone[]) => [...arr].sort((a, b) => a.urutan - b.urutan);
  const result: Array<{ m: Milestone; depth: 0 | 1 | 2 }> = [];
  for (const parent of sort(byParent.get(null) ?? [])) {
    result.push({ m: parent, depth: 0 });
    for (const sub of sort(byParent.get(parent.id) ?? [])) {
      result.push({ m: sub, depth: 1 });
      for (const leaf of sort(byParent.get(sub.id) ?? [])) {
        result.push({ m: leaf, depth: 2 });
      }
    }
  }
  return result;
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function MilestoneDatePicker({
  value, onChange, placeholder = "Pilih tanggal",
}: { value: string | null; onChange: (v: string | null) => void; placeholder?: string }) {
  const selected = value ? new Date(value + "T00:00:00") : undefined;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-xs bg-transparent hover:bg-muted/50 transition-colors text-left"
        >
          <CalendarIcon className="size-3 shrink-0 text-muted-foreground" />
          {selected
            ? format(selected, "dd MMM yy", { locale: idLocale })
            : <span className="text-muted-foreground">{placeholder}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
        <Calendar
          mode="single" selected={selected} defaultMonth={selected}
          onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : null)}
          locale={idLocale} autoFocus
        />
        {value && (
          <div className="border-t border-border p-2">
            <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => onChange(null)}>
              Hapus tanggal
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

function MilestoneRow({
  m, proyekId, depth, autoFocus, onAddChild, allMilestones, onOpenModal, personOptions,
}: {
  m: Milestone;
  proyekId: string;
  depth: 0 | 1 | 2;
  autoFocus?: boolean;
  onAddChild?: () => void;
  allMilestones: Milestone[];
  onOpenModal: (m: Milestone) => void;
  personOptions: PersonOption[];
}) {
  const updateMilestone = useUpdateMilestone();
  const moveMilestone   = useMoveMilestone();
  const deleteMilestone = useDeleteMilestone();

  // When autoFocus (newly added, empty name) — show inline input; otherwise show clickable text
  const isNew = autoFocus && m.nama === "";
  const [nama, setNama] = React.useState(m.nama);
  const [showDelete, setShowDelete] = React.useState(false);
  const namaRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => { setNama(m.nama); }, [m.nama]);
  React.useEffect(() => { if (isNew) namaRef.current?.focus(); }, [isNew]);

  const save = (patch: Partial<Omit<Milestone, "id" | "urutan">>) =>
    updateMilestone.mutate({ proyekId, milestoneId: m.id, patch });

  const siblings = allMilestones
    .filter((s) => (s.parentId ?? null) === (m.parentId ?? null))
    .sort((a, b) => a.urutan - b.urutan);
  const sibFirst = siblings[0]?.id === m.id;
  const sibLast  = siblings[siblings.length - 1]?.id === m.id;

  const inputCls = "w-full rounded px-1.5 py-0.5 text-sm bg-transparent outline-none ring-inset focus:ring-1 focus:ring-ring hover:bg-muted/50 transition-colors";
  const statusInfo = MILESTONE_STATUS_MAP[m.status];
  const indent = depth === 2 ? "pl-10" : depth === 1 ? "pl-5" : "pl-0";

  return (
    <>
      <div
        className="group grid items-center gap-2 border-b border-border px-3 py-2 last:border-0 hover:bg-muted/20 transition-colors"
        style={{ gridTemplateColumns: COL }}
      >
        {/* Reorder */}
        <div className="flex flex-col gap-0">
          <button
            type="button" disabled={sibFirst || moveMilestone.isPending}
            onClick={() => moveMilestone.mutate({ proyekId, milestoneId: m.id, direction: "up" })}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
          >
            <ChevronUp className="size-3" />
          </button>
          <button
            type="button" disabled={sibLast || moveMilestone.isPending}
            onClick={() => moveMilestone.mutate({ proyekId, milestoneId: m.id, direction: "down" })}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"
          >
            <ChevronDown className="size-3" />
          </button>
        </div>

        {/* Nama */}
        <div className={cn("flex items-center gap-1 min-w-0 overflow-hidden", indent)}>
          {depth > 0 && <span className="shrink-0 text-muted-foreground/40 text-xs">└</span>}
          {isNew ? (
            <input
              ref={namaRef}
              className={cn(inputCls, "flex-1 min-w-0 truncate")}
              value={nama}
              placeholder="Nama milestone…"
              onChange={(e) => setNama(e.target.value)}
              onBlur={() => {
                if (nama.trim() === "") {
                  deleteMilestone.mutate({ proyekId, milestoneId: m.id });
                } else {
                  save({ nama });
                }
              }}
            />
          ) : (
            <button
              type="button"
              onClick={() => onOpenModal(m)}
              className="flex-1 min-w-0 text-left px-1.5 py-0.5 rounded text-sm truncate hover:bg-muted/50 transition-colors"
            >
              {m.nama || <span className="text-muted-foreground italic">Tanpa judul</span>}
            </button>
          )}
          {depth < 2 && onAddChild && (
            <button
              type="button"
              onClick={onAddChild}
              title={depth === 0 ? "Tambah sub-milestone" : "Tambah leaf milestone"}
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <CornerDownRight className="size-3" />
            </button>
          )}
        </div>

        {/* Assignee */}
        <MilestoneAssigneeField
          assignees={m.assignees}
          personOptions={personOptions}
          onChange={(next) => save({ assignees: next })}
        />

        {/* Target */}
        <MilestoneDatePicker value={m.targetDate} onChange={(v) => { if (v !== m.targetDate) save({ targetDate: v }); }} placeholder="Target" />

        {/* Aktual */}
        <MilestoneDatePicker value={m.actualDate} onChange={(v) => { if (v !== m.actualDate) save({ actualDate: v }); }} placeholder="Aktual" />

        {/* Status */}
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted/50 transition-colors">
                <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
                <ChevronDownIcon className="size-3 text-muted-foreground shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {MILESTONE_STATUS.map((s) => (
                <DropdownMenuItem key={s.value} onSelect={() => save({ status: s.value })} className="gap-2">
                  <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tagih termin */}
        <div className="flex items-center">
          {m.status === "selesai" && m.pemicuTermin && (
            <Badge variant="warning" className="text-xs whitespace-nowrap">
              Tagih {m.pemicuTermin.persen}%
            </Badge>
          )}
        </div>

        {/* Delete */}
        <button
          type="button"
          onClick={() => setShowDelete(true)}
          className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
          aria-label="Hapus milestone"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus milestone?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{m.nama || "Milestone ini"}&rdquo; dan semua sub-milestonenya akan dihapus permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleteMilestone.isPending}
              onClick={() => deleteMilestone.mutate({ proyekId, milestoneId: m.id }, {
                onSuccess: () => toast.success("Milestone dihapus."),
              })}
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function MilestoneTab({
  proyekId, perusahaanId, milestones, onOpenModal,
}: {
  proyekId: string;
  perusahaanId: string;
  milestones: Milestone[];
  onOpenModal: (m: Milestone) => void;
}) {
  const addMilestone = useAddMilestone();
  const [newId, setNewId] = React.useState<string | null>(null);

  const personOptions = React.useMemo(() => buildPersonOptions(perusahaanId), [perusahaanId]);
  const flat = flattenTree(milestones);

  const doAdd = (parentId: string | null) => {
    const id = `ML-${Date.now()}`;
    const siblings = milestones.filter((m) => (m.parentId ?? null) === parentId);
    const maxUrutan = siblings.length > 0 ? Math.max(...siblings.map((m) => m.urutan)) : 0;
    addMilestone.mutate(
      {
        proyekId,
        milestone: {
          id, parentId, nama: "", description: null, descriptionAttachments: [], urutan: maxUrutan + 1,
          assignees: [], targetDate: null, actualDate: null,
          status: "belum_mulai", pemicuTermin: null,
        },
      },
      { onSuccess: () => setNewId(id) },
    );
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      {/* Header */}
      <div
        className="grid items-center gap-2 bg-muted/50 px-3 py-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase"
        style={{ gridTemplateColumns: COL }}
      >
        <span />
        <span>Nama</span>
        <span>Assignee</span>
        <span>Target</span>
        <span>Aktual</span>
        <span className="text-center">Status</span>
        <span />
        <span />
      </div>

      <div className="border-t border-border">
        {flat.map(({ m, depth }) => (
          <MilestoneRow
            key={m.id}
            m={m}
            proyekId={proyekId}
            depth={depth}
            autoFocus={m.id === newId}
            allMilestones={milestones}
            onAddChild={depth < 2 ? () => doAdd(m.id) : undefined}
            onOpenModal={onOpenModal}
            personOptions={personOptions}
          />
        ))}

        <button
          type="button"
          disabled={addMilestone.isPending}
          onClick={() => doAdd(null)}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors",
            flat.length > 0 && "border-t border-border",
          )}
        >
          <Plus className="size-3.5" />
          Tambah milestone
        </button>
      </div>
    </div>
  );
}

function PerusahaanPic({ perusahaanId }: { perusahaanId: string }) {
  const pics = perusahaanFixtures.find((p) => p.id === perusahaanId)?.pic ?? [];
  if (pics.length === 0) return null;
  return (
    <TooltipProvider>
      <div className="flex">
        {pics.map((pic, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <Avatar
                className="size-7 ring-2 ring-background cursor-default"
                style={{ marginLeft: i === 0 ? 0 : "-8px" }}
              >
                <AvatarFallback className="text-[10px]">{initials(pic.nama)}</AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <span className="font-medium">{pic.nama}</span>
              <span className="text-background/60 ml-1">· {pic.jabatan}</span>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

export function ProyekDetail({ proyek: initial }: { proyek: Proyek }) {
  const { data } = useProyek(initial.id, initial);
  const proyek = data ?? initial;

  const updateStatus = useUpdateProyekStatus();
  const [statusTarget, setStatusTarget] = React.useState<ProyekStatus | null>(null);
  const [modalMilestone, setModalMilestone] = React.useState<Milestone | null>(null);
  const [realisasiOpen, setRealisasiOpen] = React.useState(false);
  const { data: realisasiList = [] } = useRealisasiRabByProyek(proyek.id);
  const totalRealisasi = realisasiList.reduce((s, r) => s + r.jumlah, 0);
  const nextStatuses = TRANSITIONS[proyek.status];

  // When proyek data updates (after mutation), sync the open milestone so modal shows fresh data
  const openMilestoneId = modalMilestone?.id ?? null;
  const freshMilestone = openMilestoneId
    ? (proyek.milestones.find((m) => m.id === openMilestoneId) ?? null)
    : null;

  const handleConfirmStatus = () => {
    if (!statusTarget) return;
    updateStatus.mutate(
      { id: proyek.id, status: statusTarget },
      {
        onSuccess: () => {
          toast.success(`Status diubah: ${STATUS[statusTarget].label}`);
          setStatusTarget(null);
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
              <span className="font-mono text-sm text-muted-foreground">{proyek.id}</span>
              <Badge variant={STATUS[proyek.status].variant}>{STATUS[proyek.status].label}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Building2 className="size-3.5" />{proyek.perusahaanNama}</span>
              <span className="flex items-center gap-1"><MapPin className="size-3.5" />{proyek.area}</span>
              <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />{proyek.tahun}</span>
            </div>
          </div>

          {nextStatuses.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">Ubah Status</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {nextStatuses.filter((s) => s !== "selesai").map((s) => (
                  <DropdownMenuItem key={s} onSelect={() => setStatusTarget(s)}>
                    {STATUS[s].label}
                  </DropdownMenuItem>
                ))}
                {nextStatuses.includes("selesai") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setStatusTarget("selesai")}>
                      {STATUS.selesai.label}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <PerusahaanPic perusahaanId={proyek.perusahaanId} />
      </div>

      {/* Milestone table */}
      <MilestoneTab
        proyekId={proyek.id}
        perusahaanId={proyek.perusahaanId}
        milestones={proyek.milestones}
        onOpenModal={setModalMilestone}
      />

      {/* Milestone detail modal */}
      <MilestoneModal
        open={!!freshMilestone}
        onOpenChange={(open) => { if (!open) setModalMilestone(null); }}
        milestone={freshMilestone}
        proyek={proyek}
      />

      {/* Realisasi RAB */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Realisasi RAB</h3>
          <Button size="sm" variant="outline" onClick={() => setRealisasiOpen(true)}>+ Catat</Button>
        </div>
        {realisasiList.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada realisasi dicatat.</p>
        ) : (
          <div className="space-y-1">
            {realisasiList.map((r) => (
              <div key={r.id} className="flex justify-between text-sm py-1 border-b last:border-0">
                <span className="text-muted-foreground">{r.tanggal} · {r.kategori === "personil" ? "A" : "B"} · {r.rabLineLabel}</span>
                <span className="font-medium tabular-nums">{formatRupiah(r.jumlah)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 font-semibold">
              <span>Total Realisasi</span>
              <span className="tabular-nums">{formatRupiah(totalRealisasi)}</span>
            </div>
          </div>
        )}
        <RealisasiRabForm proyekId={proyek.id} open={realisasiOpen} onOpenChange={setRealisasiOpen} />
      </div>

      {/* Status confirm dialog */}
      <AlertDialog open={!!statusTarget} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {`Ubah status ke ${statusTarget ? STATUS[statusTarget].label : ""}?`}
            </AlertDialogTitle>
            <AlertDialogDescription>Status proyek akan diperbarui.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction disabled={updateStatus.isPending} onClick={handleConfirmStatus}>
              Ubah Status
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
