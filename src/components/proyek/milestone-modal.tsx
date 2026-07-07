"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  ChevronDown, ChevronUp, CalendarIcon, X,
  Pencil, Check, Plus, ReceiptText,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  useUpdateMilestone, useMilestoneComments, useAddMilestoneComment, useWorkflowStatuses,
  type WorkflowStatusOption,
} from "@/lib/query/proyek";
import { useKaryawanList } from "@/lib/query/karyawan";
import { useFakturList } from "@/lib/query/faktur";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Milestone, Proyek } from "@/lib/schemas/proyek";

/** Same systemRole-based heuristic as proyek-detail.tsx — status is
 * config-driven (no fixed enum), never a hardcoded label match. */
function statusVariant(status: WorkflowStatusOption | undefined): "info" | "warning" | "success" | "secondary" | "destructive" {
  if (!status) return "secondary";
  if (status.systemRole === "SELESAI") return "success";
  if (status.systemRole === "BATAL") return "destructive";
  return "info";
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "baru saja";
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return format(new Date(iso), "d MMM yyyy, HH:mm", { locale: idLocale });
}

/** Cell for the 2-column detail grid */
function DetailCell({
  label, children, className,
}: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-1 py-2.5 border-b border-border", className)}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="text-sm">{children}</div>
    </div>
  );
}

function DateCell({
  label, value, onChange, className,
}: { label: string; value: string | null; onChange: (v: string | null) => void; className?: string }) {
  const selected = value ? new Date(value + "T00:00:00") : undefined;
  return (
    <DetailCell label={label} className={className}>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button"
            className="flex items-center gap-1.5 text-sm hover:text-foreground -ml-0.5 transition-colors">
            <CalendarIcon className="size-3.5 text-muted-foreground shrink-0" />
            {selected
              ? format(selected, "d MMM yyyy", { locale: idLocale })
              : <span className="text-muted-foreground">Belum ditentukan</span>}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
          <Calendar mode="single" selected={selected} defaultMonth={selected}
            onSelect={(d) => onChange(d ? format(d, "yyyy-MM-dd") : null)}
            locale={idLocale} autoFocus />
          {value && (
            <div className="border-t border-border p-2">
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground"
                onClick={() => onChange(null)}>Hapus tanggal</button>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </DetailCell>
  );
}

/** Real comments only now — the mock's fine-grained per-field activity log
 * (status/nama/assignee/date changes) had no DB equivalent and stays out of
 * scope (see docs/architecture.md's Proyek note); attachments on a comment
 * are dropped too (no real object storage wired for this module yet). */
function ActivityFeed({ proyekId, milestoneId }: { proyekId: string; milestoneId: string }) {
  const { data: comments = [] } = useMilestoneComments(proyekId, milestoneId);
  const addComment = useAddMilestoneComment();

  const [text, setText] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments.length]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    addComment.mutate(
      { proyekId, milestoneId, input: { body: trimmed, mentionedUserIds: [] } },
      { onSuccess: () => setText("") },
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Aktivitas</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {comments.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Belum ada aktivitas</p>
        )}
        {comments.map((c) => (
          <div key={c.id} className="flex items-start gap-2.5">
            <Avatar className="size-6 shrink-0">
              <AvatarFallback className="text-[9px]">{initials(c.authorNama)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-1.5 mb-0.5">
                <span className="text-xs font-medium">{c.authorNama}</span>
                <span className="text-[10px] text-muted-foreground">{relativeTime(c.createdAt)}</span>
              </div>
              <p className="text-xs leading-relaxed wrap-break-word whitespace-pre-wrap">{c.body}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Comment input */}
      <div className="border-t border-border p-3 space-y-2 shrink-0">
        <div className="flex items-stretch gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend(); }}
            placeholder="Tulis komentar… (⌘+Enter untuk kirim)"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button type="button" onClick={handleSend}
            className="flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors min-w-8 px-2" title="Kirim">
            Kirim
          </button>
        </div>
      </div>
    </div>
  );
}

type PersonOption = { id: string; nama: string; jabatan: string };

function AssigneeField({
  assignees,
  personOptions,
  onChange,
}: {
  assignees: { karyawanId: string; nama: string }[];
  personOptions: PersonOption[];
  onChange: (next: { karyawanId: string; nama: string }[]) => void;
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

  return (
    <TooltipProvider>
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setQ(""); }}>
        <div className="flex items-center gap-1.5 flex-wrap">
          {assignees.length === 0 && (
            <span className="text-sm text-muted-foreground">—</span>
          )}
          {assignees.map((a, i) => {
            const jabatan = personOptions.find((p) => p.id === a.karyawanId)?.jabatan;
            return (
              <Tooltip key={a.karyawanId}>
                <TooltipTrigger asChild>
                  <Avatar className="size-7 ring-2 ring-background cursor-default" style={{ marginLeft: i === 0 ? 0 : "-9px" }}>
                    <AvatarFallback className="text-[10px]">{initials(a.nama)}</AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <span className="font-medium">{a.nama}</span>
                  {jabatan && <span className="text-background/60 ml-1">· {jabatan}</span>}
                </TooltipContent>
              </Tooltip>
            );
          })}
          <PopoverTrigger asChild>
            <button type="button"
              className="flex size-6 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-colors"
              style={{ marginLeft: assignees.length > 0 ? "-2px" : 0 }}>
              <Plus className="size-3" />
            </button>
          </PopoverTrigger>
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

export function MilestoneModal({
  open, onOpenChange, milestone, proyek,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  milestone: Milestone | null;
  proyek: Proyek;
}) {
  const router = useRouter();
  const updateMilestone = useUpdateMilestone();
  const { data: karyawanList = [] } = useKaryawanList();
  const personOptions: PersonOption[] = karyawanList
    .filter((k) => k.status === "aktif")
    .map((k) => ({ id: k.id, nama: k.nama, jabatan: k.jabatan }));
  const { data: statusOptions = [] } = useWorkflowStatuses("milestone");
  const { data: fakturIndukList = [] } = useFakturList(proyek.id);

  const [nama, setNama] = React.useState("");
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [descExpanded, setDescExpanded] = React.useState(false);
  const [needsExpand, setNeedsExpand] = React.useState(false);
  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  // true while user is actively typing; false on dialog open and after manual collapse
  const isAutoExpand = React.useRef(false);
  const MIN_DESC_HEIGHT = 120;

  React.useEffect(() => {
    if (!milestone) return;
    isAutoExpand.current = false;
    setNama(milestone.nama);
    setEditingTitle(false);
    setDescExpanded(false);
    setDescription(milestone.description ?? "");
    // needsExpand is computed exclusively by useLayoutEffect after description lands
  }, [milestone?.id]);

  React.useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const scrollH = el.scrollHeight;
    const hasOverflow = scrollH > MIN_DESC_HEIGHT;
    setNeedsExpand(hasOverflow);

    if (!hasOverflow) {
      // Content fits minimum — collapse silently, no button
      el.style.height = MIN_DESC_HEIGHT + "px";
      if (descExpanded) setDescExpanded(false);
    } else if (isAutoExpand.current || descExpanded) {
      // Typing caused overflow (auto-grow) OR already manually expanded
      el.style.height = scrollH + "px";
      if (!descExpanded) setDescExpanded(true);
    } else {
      // Dialog just opened / manually collapsed — stay at minimum, show Perluas
      el.style.height = MIN_DESC_HEIGHT + "px";
    }
  }, [description, descExpanded]);

  if (!milestone) return null;

  const save = (patch: {
    nama?: string;
    description?: string | null;
    assigneeIds?: string[];
    targetDate?: string | null;
    actualDate?: string | null;
    statusId?: string;
    triggersTerm?: boolean;
    linkedMasterInvoiceId?: string | null;
  }) => updateMilestone.mutate({ proyekId: proyek.id, milestoneId: milestone.id, patch });

  const currentStatus = statusOptions.find((s) => s.id === milestone.statusId);
  const linkedFaktur = fakturIndukList.find((f) => f.id === milestone.linkedMasterInvoiceId);
  const showSuggestion = currentStatus?.systemRole === "SELESAI" && milestone.triggersTerm;

  const commitTitle = () => {
    setEditingTitle(false);
    if (nama.trim() !== milestone.nama) save({ nama: nama.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="p-0 gap-0 flex flex-col overflow-hidden bg-background text-foreground"
        style={{ width: "80vw", maxWidth: "80vw", height: "80vh", maxHeight: "80vh" }}
      >
        <VisuallyHidden><DialogTitle>{nama || "Detail Milestone"}</DialogTitle></VisuallyHidden>
        {/* ── Header ── */}
        <div className="flex items-center gap-3 border-b border-border bg-background px-5 py-3 shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex items-center gap-1 rounded px-1.5 py-1 hover:bg-muted/50 transition-colors shrink-0">
                <Badge variant={statusVariant(currentStatus)} className="text-xs">{currentStatus?.label ?? "—"}</Badge>
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {statusOptions.map((s) => (
                <DropdownMenuItem key={s.id} onSelect={() => save({ statusId: s.id })} className="gap-2">
                  <Badge variant={statusVariant(s)} className="text-xs">{s.label}</Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="flex flex-1 min-w-0 items-center gap-1.5 group/title">
            {editingTitle ? (
              <input
                ref={titleInputRef} autoFocus
                className="flex-1 min-w-0 bg-transparent text-base font-semibold outline-none border-b border-muted-foreground/30 focus:border-primary pb-0.5"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTitle();
                  if (e.key === "Escape") { setNama(milestone.nama); setEditingTitle(false); }
                }}
              />
            ) : (
              <>
                <span className="text-base font-semibold truncate">
                  {nama || <span className="text-muted-foreground font-normal italic">Tanpa judul</span>}
                </span>
                <button type="button"
                  onClick={() => { setEditingTitle(true); setTimeout(() => titleInputRef.current?.focus(), 0); }}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:text-foreground opacity-0 group-hover/title:opacity-100 transition-opacity"
                  title="Edit judul">
                  <Pencil className="size-3.5" />
                </button>
              </>
            )}
          </div>

          <button type="button" onClick={() => onOpenChange(false)}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
            <X className="size-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left — 70% — scrollable panel */}
          <div className="overflow-y-auto border-r border-border" style={{ width: "70%" }}>

            {/* Detail — 2-column grid */}
            <div className="shrink-0 px-6 pt-5 pb-3">
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">Detail</p>
              <div className="grid grid-cols-2">
                <DetailCell label="Assignee" className="border-r border-border pr-6">
                  <AssigneeField
                    assignees={milestone.assignees}
                    personOptions={personOptions}
                    onChange={(next) => save({ assigneeIds: next.map((a) => a.karyawanId) })}
                  />
                </DetailCell>
                <DetailCell label="Proyek" className="pl-6">
                  <span className="font-mono text-sm text-muted-foreground">{proyek.id}</span>
                </DetailCell>

                <DateCell label="Aktual" value={milestone.actualDate}
                  onChange={(v) => { if (v !== milestone.actualDate) save({ actualDate: v }); }}
                  className="border-r border-border pr-6" />
                <DateCell label="Target" value={milestone.targetDate}
                  onChange={(v) => { if (v !== milestone.targetDate) save({ targetDate: v }); }}
                  className="pl-6" />

                <DetailCell label="Perusahaan" className="border-r border-border pr-6 border-b-0">
                  <span className="text-sm">{proyek.perusahaanNama}</span>
                </DetailCell>
                <DetailCell label="Area" className="pl-6 border-b-0">
                  <span className="text-sm text-muted-foreground">{proyek.area || "—"}</span>
                </DetailCell>
              </div>

              {/* Termin — full width. A UI suggestion only, never automatic
                  (PRD Bab 6.5) — completing this milestone never generates an
                  Invoice Termin by itself. */}
              <DetailCell label="Termin" className="col-span-2 mt-0 border-t border-border">
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={milestone.triggersTerm}
                      onCheckedChange={(c) => save({ triggersTerm: c === true })}
                    />
                    Menagih termin saat selesai
                  </label>
                  {milestone.triggersTerm && (
                    <Select
                      value={milestone.linkedMasterInvoiceId ?? "none"}
                      onValueChange={(v) => save({ linkedMasterInvoiceId: v === "none" ? null : v })}
                    >
                      <SelectTrigger className="w-full"><SelectValue placeholder="Tautkan Faktur Induk…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— Tidak ditautkan —</SelectItem>
                        {fakturIndukList.map((f) => (
                          <SelectItem key={f.id} value={f.id}>{f.layanan.map((l) => l.nama).join(", ") || "Faktur Induk"}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {showSuggestion && (
                    <Badge variant="warning" className="text-xs">
                      Milestone selesai — saatnya menagih termin
                    </Badge>
                  )}
                  {showSuggestion && linkedFaktur && (
                    <Button
                      size="sm" variant="outline" className="w-full"
                      onClick={() => router.push(`/faktur/${encodeURIComponent(linkedFaktur.id)}`)}
                    >
                      <ReceiptText className="size-3.5" /> Buka Faktur Induk untuk Buat Termin
                    </Button>
                  )}
                </div>
              </DetailCell>
            </div>

            {/* Description */}
            <div className="px-6 pt-3 pb-5">
              <p className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">Deskripsi</p>

              {/* Auto-resize textarea — always rendered */}
              <textarea
                ref={textareaRef}
                value={description}
                onChange={(e) => { isAutoExpand.current = true; setDescription(e.target.value); }}
                onBlur={() => {
                  if (description !== (milestone.description ?? "")) save({ description: description || null });
                }}
                placeholder="Tambahkan deskripsi…"
                style={{ height: `${MIN_DESC_HEIGHT}px` }}
                className="w-full resize-none overflow-hidden rounded-lg border border-input bg-muted/20 px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />

              {/* Expand/Collapse — only shown when content overflows min height */}
              {needsExpand && (
                <div className="flex justify-center mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (descExpanded) {
                        isAutoExpand.current = false; // manual collapse stops auto-grow
                        setDescExpanded(false);
                      } else {
                        setDescExpanded(true);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shadow-sm"
                  >
                    {descExpanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                    {descExpanded ? "Perkecil" : "Perluas"}
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* Right — Activity (flex-1, 30%) */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <ActivityFeed proyekId={proyek.id} milestoneId={milestone.id} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
