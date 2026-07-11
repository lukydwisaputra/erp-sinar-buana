"use client";
import * as React from "react";
import { Plus, Trash2 as Trash2Icon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useProjectSchedules, useToggleActualWeek, useAddScheduleRow, useRemoveScheduleRow,
} from "@/lib/query/proyek";
import { useSession } from "@/lib/query/session";
import { isClientPortal } from "@/lib/auth/rbac";

/**
 * Read/write Gantt view for a project — reuses the same activity_schedules
 * rows Penawaran wrote at SPH time (one section per linked service/schedule,
 * mirroring the SPH builder's per-item structure). `rencana` (outline) is the
 * plan carried over from the SPH, read-only here; `aktual` (filled) is the
 * ongoing progress Tim Teknis marks week by week.
 */
export function ProyekJadwal({ proyekId }: { proyekId: string }) {
  const { data: schedules = [], isLoading } = useProjectSchedules(proyekId);
  const toggleActual = useToggleActualWeek();
  const addRow = useAddScheduleRow();
  const removeRow = useRemoveScheduleRow();
  const [newActivityName, setNewActivityName] = React.useState("");
  const { data: session } = useSession();
  const isClient = isClientPortal(session);

  if (isLoading) return <p className="text-sm text-muted-foreground">Memuat jadwal…</p>;

  return (
    <div className="space-y-6">
      {schedules.length === 0 && (
        <p className="text-sm text-muted-foreground">Belum ada jadwal untuk proyek ini.</p>
      )}
      {schedules.map((schedule) => {
        const weeks = Array.from({ length: schedule.bulan * 4 }, (_, i) => i + 1);
        return (
          <div key={schedule.scheduleId} className="space-y-2">
            <h4 className="text-sm font-medium">{schedule.layananNama ?? "Jadwal"}</h4>
            {schedule.rows.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="border-collapse text-sm w-full">
                  <thead>
                    <tr className="text-center text-xs text-muted-foreground bg-muted/50">
                      <th className="px-2 py-1.5 text-left font-medium">Kegiatan</th>
                      {Array.from({ length: schedule.bulan }, (_, m) => (
                        <th key={m} colSpan={4} className="px-1 py-1.5 font-medium">BULAN - {m + 1}</th>
                      ))}
                      <th className="px-1 py-1.5" />
                    </tr>
                    <tr className="text-center text-xs text-muted-foreground bg-muted/50">
                      <th className="px-2 py-1" />
                      {weeks.map((w) => <th key={w} className="w-7 px-0.5 py-1 font-normal">{((w - 1) % 4) + 1}</th>)}
                      <th className="px-1 py-1" />
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.rows.map((row) => (
                      <tr key={row.id} className="border-t border-border">
                        <td className="px-2 py-1.5 max-w-50 truncate" title={row.kegiatan}>{row.kegiatan}</td>
                        {weeks.map((w) => {
                          const rencana = row.rencana.includes(w);
                          const aktual = row.aktual.includes(w);
                          const cellCls = cn(
                            "size-6 rounded-sm border transition-colors",
                            aktual
                              ? "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                              : rencana
                                ? "border-primary/50 bg-transparent hover:bg-primary/20"
                                : "border-border bg-transparent hover:bg-primary/10",
                          );
                          if (isClient) {
                            return (
                              <td key={w} className="px-0.5 py-1 text-center">
                                <span
                                  aria-label={`Minggu ${w} — rencana ${rencana ? "ya" : "tidak"}, aktual ${aktual ? "ya" : "tidak"}`}
                                  className={cn(cellCls, "inline-block hover:bg-transparent")}
                                />
                              </td>
                            );
                          }
                          return (
                            <td key={w} className="px-0.5 py-1 text-center">
                              <button
                                type="button"
                                aria-label={`Minggu ${w} — rencana ${rencana ? "ya" : "tidak"}, aktual ${aktual ? "ya" : "tidak"}`}
                                aria-pressed={aktual}
                                onClick={() => toggleActual.mutate({ proyekId, rowId: row.id, weekNumber: w })}
                                disabled={toggleActual.isPending}
                                className={cellCls}
                              />
                            </td>
                          );
                        })}
                        {!isClient && (
                          <td className="px-1 py-1">
                            <Button
                              type="button" variant="ghost" size="icon-sm" aria-label="Hapus kegiatan"
                              onClick={() => removeRow.mutate({ proyekId, rowId: row.id })}
                            >
                              <Trash2Icon className="size-4 text-destructive" />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}

      {!isClient && (
        <div className="flex items-center gap-2">
          <Input
            value={newActivityName}
            onChange={(e) => setNewActivityName(e.target.value)}
            placeholder="Nama kegiatan baru…"
            className="max-w-70"
          />
          <Button
            type="button" variant="outline" size="sm"
            disabled={!newActivityName.trim() || addRow.isPending}
            onClick={() => {
              addRow.mutate(
                { proyekId, scheduleId: schedules[0]?.scheduleId, activityName: newActivityName.trim() },
                { onSuccess: () => setNewActivityName("") },
              );
            }}
          >
            <Plus className="size-4" /> Tambah Kegiatan
          </Button>
        </div>
      )}
    </div>
  );
}
