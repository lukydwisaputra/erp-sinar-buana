import { notFound } from "next/navigation";
import { FolderKanban, Building2, MapPin, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getProyekForShare } from "@/lib/proyek/share-service";
import { formatTanggalPanjang } from "@/lib/format";
import { NotFoundError } from "@/lib/api-error";
import type { Milestone, ProyekShare } from "@/lib/schemas/proyek";

type RouteContext = { params: Promise<{ token: string }> };

function statusVariant(systemRole: string | null): "info" | "warning" | "success" | "secondary" | "destructive" {
  if (systemRole === "SELESAI") return "success";
  if (systemRole === "BATAL") return "destructive";
  return "info";
}

/** Renders each milestone under its parent, depth-first — mirrors the nesting
 * shown in the internal Proyek detail view, minus every edit affordance. */
function MilestoneNode({ milestone, all, depth }: { milestone: Milestone; all: Milestone[]; depth: number }) {
  const children = all.filter((m) => m.parentId === milestone.id);
  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
        <span className="font-medium">{milestone.nama}</span>
        <Badge variant="secondary" className="text-xs">{milestone.status}</Badge>
        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          {milestone.targetDate && <span>Target: {formatTanggalPanjang(milestone.targetDate)}</span>}
          {milestone.actualDate && <span>Aktual: {formatTanggalPanjang(milestone.actualDate)}</span>}
        </div>
      </div>
      {milestone.description && (
        <p className="mt-1 ml-1 text-sm text-muted-foreground">{milestone.description}</p>
      )}
      {milestone.assignees.length > 0 && (
        <div className="mt-1 ml-1 flex flex-wrap gap-1">
          {milestone.assignees.map((a) => (
            <Badge key={a.karyawanId} variant="outline" className="text-xs">{a.nama}</Badge>
          ))}
        </div>
      )}
      {children.length > 0 && (
        <div className="mt-2 space-y-2">
          {children.map((c) => <MilestoneNode key={c.id} milestone={c} all={all} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

function ProyekShareView({ proyek }: { proyek: ProyekShare }) {
  const roots = proyek.milestones.filter((m) => !m.parentId);
  return (
    <div className="min-h-svh bg-background">
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <FolderKanban className="size-5 text-muted-foreground" />
            {proyek.number && <span className="font-mono text-sm text-muted-foreground">{proyek.number}</span>}
            <Badge variant={statusVariant(proyek.statusSystemRole)}>{proyek.status}</Badge>
          </div>
          <h1 className="text-xl font-semibold tracking-tight">{proyek.nama}</h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Building2 className="size-3.5" />{proyek.perusahaanNama}</span>
            <span className="flex items-center gap-1"><MapPin className="size-3.5" />{proyek.area}</span>
            {proyek.tahun && <span className="flex items-center gap-1"><CalendarDays className="size-3.5" />{proyek.tahun}</span>}
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground">Milestone</h2>
          {roots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada milestone.</p>
          ) : (
            <div className="space-y-2">
              {roots.map((m) => <MilestoneNode key={m.id} milestone={m} all={proyek.milestones} depth={0} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

async function loadProyekOrNotFound(token: string): Promise<ProyekShare> {
  try {
    return await getProyekForShare(token);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

export default async function ProyekSharePage({ params }: RouteContext) {
  const { token } = await params;
  const proyek = await loadProyekOrNotFound(token);
  return <ProyekShareView proyek={proyek} />;
}
