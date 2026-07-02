"use client";
import * as React from "react";
import Link from "next/link";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import {
  Paperclip, Send, FileText, ChevronDown, ChevronUp, CalendarIcon, X,
  ExternalLink, Pencil, UploadCloud, Check, Plus,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  useUpdateMilestone, useMilestoneLog, useMilestoneComments, useAddMilestoneComment,
  useLogMilestoneActivity,
} from "@/lib/query/proyek";
import { karyawanFixtures } from "@/lib/fixtures/karyawan";
import { perusahaanFixtures } from "@/lib/fixtures/perusahaan";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { Milestone, MilestoneStatus, Proyek } from "@/lib/schemas/proyek";
import type { MilestoneAttachment } from "@/lib/data/proyek";

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


const CURRENT_USER = "Admin";

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

function isImage(a: MilestoneAttachment) {
  return a.type?.startsWith("image/") ?? /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(a.name);
}

function AttachmentPreview({
  attachment, onRemove,
}: { attachment: MilestoneAttachment; onRemove?: () => void }) {
  if (isImage(attachment)) {
    return (
      <div className="relative group/img inline-block">
        <a href={attachment.url} target="_blank" rel="noreferrer">
          <img src={attachment.url} alt={attachment.name}
            className="h-16 w-16 rounded-md object-cover border border-border" />
        </a>
        {onRemove && (
          <button type="button" onClick={onRemove}
            className="absolute -top-1.5 -right-1.5 size-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity">
            <X className="size-2.5" />
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs">
      <FileText className="size-3 shrink-0 text-muted-foreground" />
      <a href={attachment.url} target="_blank" rel="noreferrer" className="max-w-35 truncate hover:underline">
        {attachment.name}
      </a>
      {onRemove && (
        <button type="button" onClick={onRemove} className="ml-0.5 text-muted-foreground hover:text-destructive">
          <X className="size-3" />
        </button>
      )}
    </div>
  );
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

function ActivityFeed({ proyekId, milestoneId }: { proyekId: string; milestoneId: string }) {
  const { data: logEntries = [] } = useMilestoneLog(proyekId, milestoneId);
  const { data: comments = [] } = useMilestoneComments(proyekId, milestoneId);
  const addComment = useAddMilestoneComment();

  const [text, setText] = React.useState("");
  const [attachments, setAttachments] = React.useState<MilestoneAttachment[]>([]);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  type TimelineItem =
    | { type: "log"; id: string; description: string; timestamp: string }
    | { type: "comment"; id: string; author: string; content: string; attachments: MilestoneAttachment[]; timestamp: string };

  const timeline: TimelineItem[] = [
    ...logEntries.map((e) => ({ type: "log" as const, id: e.id, description: e.description, timestamp: e.timestamp })),
    ...comments.map((c) => ({ type: "comment" as const, id: c.id, author: c.author, content: c.content, attachments: c.attachments, timestamp: c.timestamp })),
  ].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline.length]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    setAttachments((prev) => [
      ...prev,
      ...files.map((f) => ({ name: f.name, url: URL.createObjectURL(f), type: f.type })),
    ]);
    e.target.value = "";
  };

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed && attachments.length === 0) return;
    addComment.mutate(
      { proyekId, milestoneId, input: { author: CURRENT_USER, content: trimmed, attachments } },
      { onSuccess: () => { setText(""); setAttachments([]); } },
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-border shrink-0">
        <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Aktivitas</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {timeline.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">Belum ada aktivitas</p>
        )}
        {timeline.map((item) =>
          item.type === "log" ? (
            <div key={item.id} className="flex items-start gap-2.5">
              <div className="mt-0.5 size-4 shrink-0 rounded-full bg-muted/80 flex items-center justify-center">
                <div className="size-1 rounded-full bg-muted-foreground/50" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                <p className="text-[10px] text-muted-foreground/50 mt-0.5">{relativeTime(item.timestamp)}</p>
              </div>
            </div>
          ) : (
            <div key={item.id} className="flex items-start gap-2.5">
              <Avatar className="size-6 shrink-0">
                <AvatarFallback className="text-[9px]">{initials(item.author)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-1.5 mb-0.5">
                  <span className="text-xs font-medium">{item.author}</span>
                  <span className="text-[10px] text-muted-foreground">{relativeTime(item.timestamp)}</span>
                </div>
                {item.content && (
                  <p className="text-xs leading-relaxed wrap-break-word whitespace-pre-wrap">{item.content}</p>
                )}
                {item.attachments.length > 0 && (
                  <div className="mt-1.5 space-y-1.5">
                    {item.attachments.filter(isImage).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {item.attachments.filter(isImage).map((a, i) => (
                          <a key={i} href={a.url} target="_blank" rel="noreferrer">
                            <img src={a.url} alt={a.name} className="h-14 rounded object-cover border border-border" />
                          </a>
                        ))}
                      </div>
                    )}
                    {item.attachments.filter((a) => !isImage(a)).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.attachments.filter((a) => !isImage(a)).map((a, i) => (
                          <AttachmentPreview key={i} attachment={a} />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Comment input */}
      <div className="border-t border-border p-3 space-y-2 shrink-0">
        {attachments.length > 0 && (
          <div className="space-y-1.5">
            {attachments.filter(isImage).length > 0 && (
              <div className="flex flex-wrap gap-2">
                {attachments.filter(isImage).map((a, i) => (
                  <AttachmentPreview key={i} attachment={a}
                    onRemove={() => setAttachments((prev) => prev.filter((x) => x !== a))} />
                ))}
              </div>
            )}
            {attachments.filter((a) => !isImage(a)).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {attachments.filter((a) => !isImage(a)).map((a, i) => (
                  <AttachmentPreview key={i} attachment={a}
                    onRemove={() => setAttachments((prev) => prev.filter((x) => x !== a))} />
                ))}
              </div>
            )}
          </div>
        )}
        <div className="flex items-stretch gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSend(); }}
            placeholder="Tulis komentar… (⌘+Enter untuk kirim)"
            rows={2}
            className="flex-1 resize-none rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <div className="flex flex-col gap-1">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="flex-1 flex items-center justify-center rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/70 transition-colors min-w-8" title="Lampirkan">
              <Paperclip className="size-3.5" />
            </button>
            <button type="button" onClick={handleSend}
              className="flex-1 flex items-center justify-center rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors min-w-8" title="Kirim">
              <Send className="size-3.5" />
            </button>
          </div>
        </div>
        <input ref={fileRef} type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
          className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

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

function AssigneeField({
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
        <div className="flex items-center gap-1.5 flex-wrap">
          {assignees.length === 0 && (
            <span className="text-sm text-muted-foreground">—</span>
          )}
          {assignees.map((a, i) => {
            const jabatan = personOptions.find((p) => p.id === a.id)?.jabatan;
            return (
              <Tooltip key={a.id}>
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

export function MilestoneModal({
  open, onOpenChange, milestone, proyek,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  milestone: Milestone | null;
  proyek: Proyek;
}) {
  const updateMilestone = useUpdateMilestone();
  const logActivity = useLogMilestoneActivity();

  const [nama, setNama] = React.useState("");
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [description, setDescription] = React.useState("");
  const [descExpanded, setDescExpanded] = React.useState(false);
  const [needsExpand, setNeedsExpand] = React.useState(false);
  const [descAttachments, setDescAttachments] = React.useState<MilestoneAttachment[]>([]);
  const [isDragging, setIsDragging] = React.useState(false);
  const descFileRef = React.useRef<HTMLInputElement>(null);
  const titleInputRef = React.useRef<HTMLInputElement>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  // true while user is actively typing; false on dialog open and after manual collapse
  const isAutoExpand = React.useRef(false);
  const MIN_DESC_HEIGHT = 120;

  React.useEffect(() => {
    if (!milestone) return;
    isAutoExpand.current = false;
    setNama(milestone.nama);
    setDescAttachments(milestone.descriptionAttachments ?? []);
    setEditingTitle(false);
    setDescExpanded(false);
    setIsDragging(false);
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

  const save = (patch: Partial<Omit<import("@/lib/schemas/proyek").Milestone, "id" | "urutan">>) =>
    updateMilestone.mutate({ proyekId: proyek.id, milestoneId: milestone.id, patch });

  const statusInfo = MILESTONE_STATUS_MAP[milestone.status];

  const addAttachments = (files: File[]) => {
    const newItems: MilestoneAttachment[] = files.map((f) => ({
      name: f.name, url: URL.createObjectURL(f), type: f.type,
    }));
    const next = [...descAttachments, ...newItems];
    setDescAttachments(next);
    save({ descriptionAttachments: next });
    newItems.forEach((a) =>
      logActivity.mutate({ proyekId: proyek.id, milestoneId: milestone.id, message: `Lampiran ditambahkan: ${a.name}` }),
    );
  };

  const handleDescFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    addAttachments(Array.from(e.target.files ?? []));
    e.target.value = "";
  };

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
                <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
                <ChevronDown className="size-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {MILESTONE_STATUS.map((s) => (
                <DropdownMenuItem key={s.value} onSelect={() => save({ status: s.value })} className="gap-2">
                  <Badge variant={s.variant} className="text-xs">{s.label}</Badge>
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
                    personOptions={buildPersonOptions(proyek.perusahaanId)}
                    onChange={(next) => save({ assignees: next })}
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

              {/* Termin — full width */}
              {milestone.pemicuTermin && (
                <DetailCell label="Termin" className="col-span-2 mt-0 border-t border-border">
                  <Link
                    href={`/faktur/${encodeURIComponent(milestone.pemicuTermin.fakturId)}`}
                    className="inline-flex items-center gap-1.5 text-sm text-[var(--link)] hover:underline"
                  >
                    {milestone.pemicuTermin.fakturId}
                    <ExternalLink className="size-3" />
                    <Badge variant="warning" className="text-xs">{milestone.pemicuTermin.persen}%</Badge>
                  </Link>
                </DetailCell>
              )}
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

            {/* Lampiran */}
            <div className="px-6 pt-3 pb-5">
              <p className="mb-3 text-xs font-medium uppercase tracking-widest text-muted-foreground">Lampiran</p>

              {/* Dropzone */}
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  "flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-6 transition-colors cursor-pointer select-none outline-none",
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/40 hover:bg-muted/20 focus-visible:border-primary focus-visible:bg-primary/5",
                )}
                onClick={() => descFileRef.current?.click()}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") descFileRef.current?.click(); }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  addAttachments(Array.from(e.dataTransfer.files));
                }}
              >
                <UploadCloud className={cn("size-7 transition-colors", isDragging ? "text-primary" : "text-muted-foreground")} />
                <div className="text-center">
                  <p className="text-xs font-medium">
                    {isDragging ? "Lepaskan untuk mengunggah" : "Seret file ke sini atau klik untuk memilih"}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Gambar, PDF, Word, Excel</p>
                </div>
              </div>
              <input ref={descFileRef} type="file" multiple
                accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx"
                className="hidden" onChange={handleDescFile} />

              {/* Unified file list — images and docs in the same row format */}
              {descAttachments.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {descAttachments.map((a, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
                      {isImage(a) ? (
                        <img src={a.url} alt={a.name}
                          className="h-9 w-9 shrink-0 rounded object-cover border border-border/50" />
                      ) : (
                        <div className="h-9 w-9 shrink-0 rounded bg-muted flex items-center justify-center">
                          <FileText className="size-4 text-muted-foreground" />
                        </div>
                      )}
                      <a href={a.url} target="_blank" rel="noreferrer"
                        className="flex-1 min-w-0 text-xs truncate hover:underline text-foreground">
                        {a.name}
                      </a>
                      <button type="button"
                        onClick={() => { const next = descAttachments.filter((x) => x !== a); setDescAttachments(next); save({ descriptionAttachments: next }); }}
                        className="shrink-0 rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors">
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
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
