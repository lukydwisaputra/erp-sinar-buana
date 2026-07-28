"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  FolderKanban, Building2, MapPin, CalendarDays, Check,
  ChevronUp, ChevronDown, Trash2, Plus, CalendarIcon, CornerDownRight, ChevronDown as ChevronDownIcon,
  FileText, Receipt, Link2, Pencil, History,
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  useProyek, useUpdateProyek, useWorkflowStatuses, type WorkflowStatusOption,
  useUpdateMilestone, useMoveMilestone, useAddMilestone, useDeleteMilestone,
  useProyekLog,
} from "@/lib/query/proyek";
import { useKaryawanList } from "@/lib/query/karyawan";
import { useOptionList } from "@/lib/query/daftar-pilihan";
import { useForm, Controller, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormSheet } from "@/components/shared/form-sheet";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePerusahaanList } from "@/lib/query/perusahaan";
import { useSession } from "@/lib/query/session";
import { isFinance as checkFinanceAccess, isClientPortal, isAdminUser } from "@/lib/auth/rbac";
import { ProyekJadwal } from "@/components/proyek/proyek-jadwal";
import { ProyekRab } from "@/components/proyek/proyek-rab";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Proyek, Milestone } from "@/lib/schemas/proyek";
import { MilestoneModal } from "@/components/proyek/milestone-modal";
import { RealisasiRabForm } from "@/components/realisasi-rab/realisasi-rab-form";
import { useRealisasiRabByProyek, useRemoveRealisasiRab } from "@/lib/query/realisasi-rab";
import { ConfirmDeleteDialog } from "@/components/shared/confirm-delete-dialog";
import type { RealisasiRab } from "@/lib/schemas/realisasi-rab";
import { formatRupiah } from "@/lib/format";
import { CancelPembatalanModal } from "@/components/shared/cancel-pembatalan-modal";
import { useCancelPembatalan } from "@/lib/query/pembatalan";

/** Status badge variant heuristic — workflow_statuses is config-driven (no
 * fixed enum), so this maps by systemRole rather than a hardcoded label
 * lookup (clients rename/reorder labels freely, PRD Bab 9.2). */
function statusVariant(status: WorkflowStatusOption | undefined): "info" | "warning" | "success" | "secondary" | "destructive" {
  if (!status) return "secondary";
  if (status.systemRole === "SELESAI") return "success";
  if (status.systemRole === "BATAL") return "destructive";
  return "info";
}

const COL = "20px 1fr 100px 110px 110px 140px 72px 28px";

type PersonOption = { id: string; nama: string; jabatan: string };

function MilestoneAssigneeField({
  assignees,
  personOptions,
  onChange,
  readOnly,
}: {
  assignees: { karyawanId: string; nama: string }[];
  personOptions: PersonOption[];
  onChange: (next: { karyawanId: string; nama: string }[]) => void;
  readOnly?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [q, setQ] = React.useState("");
  const selectedIds = new Set(assignees.map((a) => a.karyawanId));

  const filtered = q.trim()
    ? personOptions.filter((o) => o.nama.toLowerCase().includes(q.toLowerCase()) || o.jabatan.toLowerCase().includes(q.toLowerCase()))
    : personOptions;

  const toggle = (person: PersonOption) => {
    const next = selectedIds.has(person.id)
      ? assignees.filter((a) => a.karyawanId !== person.id)
      : [...assignees, { karyawanId: person.id, nama: person.nama }];
    onChange(next);
  };

  // Client portal: plain avatars, no popover/edit affordance at all.
  if (readOnly) {
    if (assignees.length === 0) return <span className="text-xs text-muted-foreground px-1">—</span>;
    return (
      <TooltipProvider>
        <div className="flex">
          {assignees.map((a, i) => {
            const jabatan = personOptions.find((p) => p.id === a.karyawanId)?.jabatan;
            return (
              <Tooltip key={a.karyawanId}>
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
      </TooltipProvider>
    );
  }

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
                  const jabatan = personOptions.find((p) => p.id === a.karyawanId)?.jabatan;
                  return (
                    <Tooltip key={a.karyawanId}>
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
            {filtered.map((person) => (
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
  value, onChange, placeholder = "Pilih tanggal", readOnly,
}: { value: string | null; onChange: (v: string | null) => void; placeholder?: string; readOnly?: boolean }) {
  const selected = value ? new Date(value + "T00:00:00") : undefined;
  if (readOnly) {
    return (
      <span className="flex items-center gap-1 px-1.5 py-0.5 text-xs text-muted-foreground">
        <CalendarIcon className="size-3 shrink-0" />
        {selected ? format(selected, "dd MMM yy", { locale: idLocale }) : "—"}
      </span>
    );
  }
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
  m, proyekId, depth, autoFocus, onAddChild, allMilestones, onOpenModal, personOptions, statusOptions,
}: {
  m: Milestone;
  proyekId: string;
  depth: 0 | 1 | 2;
  autoFocus?: boolean;
  onAddChild?: () => void;
  allMilestones: Milestone[];
  onOpenModal: (m: Milestone) => void;
  personOptions: PersonOption[];
  statusOptions: WorkflowStatusOption[];
}) {
  const router = useRouter();
  const updateMilestone = useUpdateMilestone();
  const moveMilestone   = useMoveMilestone();
  const deleteMilestone = useDeleteMilestone();
  const { data: session } = useSession();
  const isFinance = checkFinanceAccess(session);
  // Client portal — read-only everywhere on this row: no reorder, no delete,
  // no inline edits. Never fires in practice (write API already rejects
  // viewer), this just keeps the UI honest about what's actually possible.
  const isClient = isClientPortal(session);

  // When autoFocus (newly added, empty name) — show inline input; otherwise show clickable text
  const isNew = autoFocus && m.nama === "";
  const [nama, setNama] = React.useState(m.nama);
  const [showDelete, setShowDelete] = React.useState(false);
  const namaRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const syncNama = () => setNama(m.nama);
    syncNama();
  }, [m.nama]);
  React.useEffect(() => { if (isNew) namaRef.current?.focus(); }, [isNew]);

  const save = (patch: {
    nama?: string;
    assigneeIds?: string[];
    targetDate?: string | null;
    actualDate?: string | null;
    statusId?: string;
    triggersTerm?: boolean;
  }) => updateMilestone.mutate({ proyekId, milestoneId: m.id, patch });

  const siblings = allMilestones
    .filter((s) => (s.parentId ?? null) === (m.parentId ?? null))
    .sort((a, b) => a.urutan - b.urutan);
  const sibFirst = siblings[0]?.id === m.id;
  const sibLast  = siblings[siblings.length - 1]?.id === m.id;

  const inputCls = "w-full rounded px-1.5 py-0.5 text-sm bg-transparent outline-none ring-inset focus:ring-1 focus:ring-ring hover:bg-muted/50 transition-colors";
  const currentStatus = statusOptions.find((s) => s.id === m.statusId);
  const indent = depth === 2 ? "pl-10" : depth === 1 ? "pl-5" : "pl-0";

  return (
    <>
      <div
        className="group grid items-center gap-2 border-b border-border px-3 py-2 last:border-0 hover:bg-muted/20 transition-colors"
        style={{ gridTemplateColumns: COL }}
      >
        {/* Reorder */}
        <div className="flex flex-col gap-0">
          {!isClient && (
            <>
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
            </>
          )}
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
          {depth < 2 && onAddChild && !isClient && (
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
          onChange={(next) => save({ assigneeIds: next.map((a) => a.karyawanId) })}
          readOnly={isClient}
        />

        {/* Target */}
        <MilestoneDatePicker value={m.targetDate} onChange={(v) => { if (v !== m.targetDate) save({ targetDate: v }); }} placeholder="Target" readOnly={isClient} />

        {/* Aktual */}
        <MilestoneDatePicker value={m.actualDate} onChange={(v) => { if (v !== m.actualDate) save({ actualDate: v }); }} placeholder="Aktual" readOnly={isClient} />

        {/* Status */}
        <div className="flex justify-center">
          {isClient ? (
            <Badge variant={statusVariant(currentStatus)} className="text-xs">{currentStatus?.label ?? "—"}</Badge>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex items-center gap-1 rounded px-1 py-0.5 hover:bg-muted/50 transition-colors">
                  <Badge variant={statusVariant(currentStatus)} className="text-xs">{currentStatus?.label ?? "—"}</Badge>
                  <ChevronDownIcon className="size-3 text-muted-foreground shrink-0" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center">
                {statusOptions.map((s) => (
                  <DropdownMenuItem key={s.id} onSelect={() => save({ statusId: s.id })} className="gap-2">
                    <Badge variant={statusVariant(s)} className="text-xs">{s.label}</Badge>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Tagih termin — a suggestion only (PRD Bab 6.5), never automatic;
            clickable straight to the linked Faktur Induk when one exists —
            only for Admin/Keuangan, who are the only roles with any Faktur
            access at all now. */}
        <div className="flex items-center">
          {currentStatus?.systemRole === "SELESAI" && m.triggersTerm && (
            m.linkedMasterInvoiceId && isFinance ? (
              <button type="button" onClick={() => router.push(`/faktur/${encodeURIComponent(m.linkedMasterInvoiceId!)}`)}>
                <Badge variant="warning" className="text-xs whitespace-nowrap hover:underline">
                  Tagih Termin
                </Badge>
              </button>
            ) : (
              <Badge variant="warning" className="text-xs whitespace-nowrap">
                Tagih Termin
              </Badge>
            )
          )}
        </div>

        {/* Delete */}
        {!isClient && (
          <button
            type="button"
            onClick={() => setShowDelete(true)}
            className="rounded p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100"
            aria-label="Hapus milestone"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
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
  proyekId, milestones, onOpenModal,
}: {
  proyekId: string;
  milestones: Milestone[];
  onOpenModal: (m: Milestone) => void;
}) {
  const addMilestone = useAddMilestone();
  const [newId, setNewId] = React.useState<string | null>(null);
  const { data: session } = useSession();
  const isClient = isClientPortal(session);

  const { data: karyawanList = [] } = useKaryawanList();
  const personOptions: PersonOption[] = karyawanList
    .filter((k) => k.status === "aktif")
    .map((k) => ({ id: k.id, nama: k.nama, jabatan: k.jabatan }));
  const { data: statusOptions = [] } = useWorkflowStatuses("milestone");
  const flat = flattenTree(milestones);

  const doAdd = (parentId: string | null) => {
    addMilestone.mutate(
      { proyekId, input: { parentId, nama: "", assigneeIds: [], targetDate: null } },
      {
        onSuccess: (updated) => {
          const siblings = updated.milestones.filter((m) => (m.parentId ?? null) === parentId);
          const last = siblings.reduce<Milestone | null>((a, b) => (!a || b.urutan > a.urutan ? b : a), null);
          if (last) setNewId(last.id);
        },
      },
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
            statusOptions={statusOptions}
          />
        ))}

        {!isClient && (
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
        )}
      </div>
    </div>
  );
}

function PerusahaanPic({ perusahaanId }: { perusahaanId: string }) {
  const { data: perusahaanList = [] } = usePerusahaanList();
  const pics = perusahaanList.find((p) => p.id === perusahaanId)?.pic ?? [];
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

const ubahProyekSchema = z.object({
  nama: z.string().min(1, "Nama proyek wajib diisi."),
  areaId: z.string().optional(),
  tahun: z.coerce.number().optional(),
  statusId: z.string().optional(),
  assigneeIds: z.array(z.string()),
});
type UbahProyekForm = z.infer<typeof ubahProyekSchema>;

/** Single edit surface for a Proyek — same fields as the (now-removed) manual
 * "Buat Proyek" create form, plus status, since Proyek is no longer created
 * manually (auto-created by the SPH Deal-transition cascade). Nama/Area/Tahun
 * fill in what the cascade can't derive from the SPH alone. */
function UbahProyekForm({ proyek, open, onOpenChange, statusOptions }: { proyek: Proyek; open: boolean; onOpenChange: (o: boolean) => void; statusOptions: WorkflowStatusOption[] }) {
  const updateProyek = useUpdateProyek();
  const { data: areaOptions = [] } = useOptionList("area_kawasan");
  const { data: karyawanList = [] } = useKaryawanList();
  const activeKaryawan = karyawanList.filter((k) => k.status === "aktif");

  const defaults = React.useCallback((p: Proyek): UbahProyekForm => ({
    nama: p.nama,
    areaId: p.areaId ?? "",
    tahun: p.tahun ?? new Date().getFullYear(),
    statusId: p.statusId ?? "",
    assigneeIds: p.assignees.map((a) => a.karyawanId),
  }), []);
  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<UbahProyekForm>({
    resolver: zodResolver(ubahProyekSchema) as Resolver<UbahProyekForm>,
    defaultValues: defaults(proyek),
  });

  React.useEffect(() => { if (open) reset(defaults(proyek)); }, [open, proyek, reset, defaults]);

  const onSubmit = handleSubmit(async (values) => {
    await updateProyek.mutateAsync({
      id: proyek.id,
      input: { nama: values.nama, areaId: values.areaId, tahun: values.tahun, statusId: values.statusId, assigneeIds: values.assigneeIds },
    });
    onOpenChange(false);
  });

  return (
    <FormSheet
      open={open}
      onOpenChange={(o) => { onOpenChange(o); if (!o) reset(); }}
      title="Ubah Proyek"
      description={`Perbarui data proyek ${proyek.number ?? proyek.id}.`}
      onSubmit={onSubmit}
      submitLabel={updateProyek.isPending ? "Menyimpan…" : "Simpan Perubahan"}
    >
      <Field data-invalid={!!errors.nama}>
        <FieldLabel htmlFor="pr-nama">Nama Proyek</FieldLabel>
        <Input id="pr-nama" aria-invalid={!!errors.nama} {...register("nama")} />
        <FieldError errors={errors.nama ? [errors.nama] : undefined} />
      </Field>

      <Field>
        <FieldLabel htmlFor="pr-area">Area / Kawasan</FieldLabel>
        <Controller
          control={control}
          name="areaId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="pr-area" className="w-full">
                <SelectValue placeholder="Pilih area/kawasan…" />
              </SelectTrigger>
              <SelectContent>
                {areaOptions.map((o) => <SelectItem key={o.id} value={o.id}>{o.nama}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <Field data-invalid={!!errors.tahun}>
        <FieldLabel htmlFor="pr-tahun">Tahun Pengerjaan</FieldLabel>
        <Input id="pr-tahun" type="number" aria-invalid={!!errors.tahun} {...register("tahun")} />
        <FieldError errors={errors.tahun ? [errors.tahun] : undefined} />
      </Field>

      <Field>
        <FieldLabel htmlFor="pr-status">Status</FieldLabel>
        <Controller
          control={control}
          name="statusId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger id="pr-status" className="w-full">
                <SelectValue placeholder="Pilih status…" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        />
      </Field>

      <div className="space-y-2">
        <FieldLabel>Assignee</FieldLabel>
        <Controller
          control={control}
          name="assigneeIds"
          render={({ field }) => (
            <div className="space-y-2">
              {activeKaryawan.map((k) => (
                <label key={k.id} className="flex cursor-pointer items-center gap-2.5">
                  <Checkbox
                    checked={field.value.includes(k.id)}
                    onCheckedChange={(checked) => {
                      field.onChange(checked ? [...field.value, k.id] : field.value.filter((id) => id !== k.id));
                    }}
                  />
                  <span className="text-sm">{k.nama}</span>
                  <span className="text-xs text-muted-foreground">{k.jabatan}</span>
                </label>
              ))}
            </div>
          )}
        />
      </div>
    </FormSheet>
  );
}

// ── Aktivitas — status-change audit trail (project_status_log, DB-trigger-
// written) — staff-only, mirrors the API route's role gate (not Viewer). ──
function ProyekAktivitas({ proyekId }: { proyekId: string }) {
  const { data: log = [], isLoading } = useProyekLog(proyekId);

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <History className="size-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold">Aktivitas</h3>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : log.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada perubahan status.</p>
      ) : (
        <div className="space-y-1">
          {log.map((entry) => (
            <div key={entry.id} className="flex items-start justify-between gap-4 border-b py-1.5 text-sm last:border-0">
              <span>
                {entry.fromStatus ? (
                  <>Status berubah dari <strong>{entry.fromStatus}</strong> ke <strong>{entry.toStatus}</strong></>
                ) : (
                  <>Status awal diset ke <strong>{entry.toStatus}</strong></>
                )}
                {entry.changedByNama && <span className="text-muted-foreground"> — oleh {entry.changedByNama}</span>}
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {format(new Date(entry.changedAt), "d MMM yyyy HH:mm", { locale: idLocale })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProyekDetail({ proyek: initial }: { proyek: Proyek }) {
  const router = useRouter();
  const { data } = useProyek(initial.id, initial);
  const proyek = data ?? initial;

  const { data: statusOptions = [] } = useWorkflowStatuses("proyek");
  const [modalMilestone, setModalMilestone] = React.useState<Milestone | null>(null);
  const [realisasiOpen, setRealisasiOpen] = React.useState(false);
  const [editingRealisasi, setEditingRealisasi] = React.useState<RealisasiRab | null>(null);
  const [deletingRealisasi, setDeletingRealisasi] = React.useState<RealisasiRab | null>(null);
  const removeRealisasi = useRemoveRealisasiRab();
  const [ubahOpen, setUbahOpen] = React.useState(false);
  const [cancelOpen, setCancelOpen] = React.useState(false);
  const cancelPembatalan = useCancelPembatalan();
  const { data: session } = useSession();
  const canSeeCost = checkFinanceAccess(session);
  const isClient = isClientPortal(session);
  const isAdmin = isAdminUser(session);
  const { data: realisasiList = [] } = useRealisasiRabByProyek(proyek.id);
  const totalRealisasi = realisasiList.reduce((s, r) => s + r.jumlah, 0);
  const currentStatus = statusOptions.find((s) => s.id === proyek.statusId);

  // When proyek data updates (after mutation), sync the open milestone so modal shows fresh data
  const openMilestoneId = modalMilestone?.id ?? null;
  const freshMilestone = openMilestoneId
    ? (proyek.milestones.find((m) => m.id === openMilestoneId) ?? null)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <FolderKanban className="size-5 text-muted-foreground shrink-0" />
              <span className="font-mono text-sm text-muted-foreground">{proyek.number ?? "—"}</span>
              <Badge variant={statusVariant(currentStatus)}>{proyek.status}</Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><Building2 className="size-3.5" />{proyek.perusahaanNama}</span>
              <span className="flex items-center gap-1"><MapPin className="size-3.5" />{proyek.area || "—"}</span>
              <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />{proyek.tahun}</span>
            </div>
            {(proyek.sphNumber || proyek.fakturs.length > 0) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                {proyek.sphNumber && (
                  <span className="flex items-center gap-1">
                    <FileText className="size-3.5" /> No. SPH: <span className="font-mono">{proyek.sphNumber}</span>
                  </span>
                )}
                {proyek.fakturs.length > 0 && (
                  <span className="flex items-center gap-1 flex-wrap">
                    <Receipt className="size-3.5" /> No. Faktur:{" "}
                    {proyek.fakturs.map((f, i) => (
                      <React.Fragment key={f.id}>
                        {i > 0 && ", "}
                        <button
                          type="button"
                          onClick={() => router.push(`/faktur/${encodeURIComponent(f.id)}`)}
                          className="font-mono text-(--link) hover:underline"
                        >
                          {f.number ?? "—"}
                        </button>
                      </React.Fragment>
                    ))}
                  </span>
                )}
              </div>
            )}
          </div>

          {!isClient && (
            <div className="flex items-center gap-2">
              {isAdmin && proyek.statusSystemRole !== "BATAL" && (
                <Button variant="destructive" size="sm" onClick={() => setCancelOpen(true)}>Batalkan</Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const url = `${window.location.origin}/proyek/share/${proyek.shareToken}`;
                  navigator.clipboard.writeText(url);
                  toast.success("Link proyek disalin.");
                }}
              >
                <Link2 className="size-4" /> Copy Link
              </Button>
              <Button variant="outline" size="sm" onClick={() => setUbahOpen(true)}>Ubah</Button>
            </div>
          )}
        </div>

        <UbahProyekForm proyek={proyek} open={ubahOpen} onOpenChange={setUbahOpen} statusOptions={statusOptions} />

        {/* Batalkan — cascades to the linked SPH + Faktur Induk too */}
        <CancelPembatalanModal
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          isPending={cancelPembatalan.isPending}
          onConfirm={({ alasan, biayaAdministrasi }) => {
            cancelPembatalan.mutate(
              { proyekId: proyek.id, alasan, biayaAdministrasi },
              { onSuccess: () => setCancelOpen(false) },
            );
          }}
        />

        <PerusahaanPic perusahaanId={proyek.perusahaanId} />
      </div>

      {/* Milestone table */}
      <MilestoneTab
        proyekId={proyek.id}
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

      {/* Jadwal (Gantt) — reuses the SPH's Estimasi Jadwal rows after Deal */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Estimasi Jadwal</h3>
        <ProyekJadwal proyekId={proyek.id} />
      </div>

      {/* Estimasi RAB — biaya rencana proyek, Admin/Keuangan only (PRD Bab 6.8, view_project_cost) */}
      {canSeeCost && (
        <div>
          <h3 className="text-sm font-semibold mb-3">Estimasi RAB</h3>
          <ProyekRab proyekId={proyek.id} />
        </div>
      )}

      {/* Realisasi RAB — biaya/margin proyek, Admin/Keuangan only (PRD Bab 6.8, view_project_cost) */}
      {canSeeCost && (
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
                <div key={r.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                  <span className="text-muted-foreground">{r.tanggal} · {r.kategori === "personil" ? "A" : "B"} · {r.rabLineLabel}</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium tabular-nums">{formatRupiah(r.jumlah)}</span>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => setEditingRealisasi(r)}>
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="size-7" onClick={() => setDeletingRealisasi(r)}>
                      <Trash2 className="size-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between text-sm pt-2 font-semibold">
                <span>Total Realisasi</span>
                <span className="tabular-nums">{formatRupiah(totalRealisasi)}</span>
              </div>
            </div>
          )}
          <RealisasiRabForm proyekId={proyek.id} open={realisasiOpen} onOpenChange={setRealisasiOpen} />
          <RealisasiRabForm
            proyekId={proyek.id}
            open={!!editingRealisasi}
            onOpenChange={(o) => { if (!o) setEditingRealisasi(null); }}
            editing={editingRealisasi}
          />
          <ConfirmDeleteDialog
            open={!!deletingRealisasi}
            onOpenChange={(o) => { if (!o) setDeletingRealisasi(null); }}
            entityLabel="Realisasi RAB"
            target={deletingRealisasi?.rabLineLabel}
            loading={removeRealisasi.isPending}
            onConfirm={() => {
              if (!deletingRealisasi) return;
              removeRealisasi.mutate(
                { id: deletingRealisasi.id, proyekId: proyek.id },
                { onSuccess: () => setDeletingRealisasi(null) },
              );
            }}
          />
        </div>
      )}

      {!isClient && <ProyekAktivitas proyekId={proyek.id} />}
    </div>
  );
}
