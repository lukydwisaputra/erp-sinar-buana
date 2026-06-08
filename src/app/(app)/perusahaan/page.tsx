"use client";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, FileText, FolderKanban, Receipt, Wallet } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import { usePerusahaanList } from "@/lib/query/perusahaan";
import type { PIC, Perusahaan } from "@/lib/schemas/perusahaan";

function StatusBadge({ status }: { status: Perusahaan["status"] }) {
  return status === "aktif" ? (
    <Badge variant="success">Aktif</Badge>
  ) : (
    <Badge variant="secondary">Nonaktif</Badge>
  );
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

/** Columns are built with an `onOpen` callback so the ID/Nama cells open the detail drawer. */
function makeColumns(onOpen: (p: Perusahaan) => void): ColumnDef<Perusahaan>[] {
  return [
    {
      accessorKey: "id",
      header: "ID",
      meta: { mono: true },
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onOpen(row.original)}
          className="rounded-sm font-mono text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {row.original.id}
        </button>
      ),
    },
    {
      accessorKey: "nama",
      header: "Nama Perusahaan",
      cell: ({ row }) => (
        <button
          type="button"
          onClick={() => onOpen(row.original)}
          className="rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          {row.original.nama}
        </button>
      ),
    },
    {
      id: "pic",
      header: "PIC",
      accessorFn: (row) => row.pic[0]?.nama ?? "",
      cell: ({ row }) => {
        const pics = row.original.pic;
        const extra = pics.length - 1;
        return (
          <span>
            {pics[0]?.nama ?? "—"}
            {extra > 0 && <span className="ml-1 text-muted-foreground">+{extra}</span>}
          </span>
        );
      },
    },
    { accessorKey: "kota", header: "Kota" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
  ];
}

/* ---------- detail drawer pieces ---------- */

function Stat({ label, value, icon: Icon, mono, title }: {
  label: string; value: string; icon: typeof FileText; mono?: boolean; title?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <p className={cn("mt-1 truncate text-base font-semibold text-foreground", mono && "font-mono tabular-nums")} title={title ?? value}>
        {value}
      </p>
    </div>
  );
}

function PicCard({ pic }: { pic: PIC }) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2.5">
        <Avatar className="size-9"><AvatarFallback className="text-xs">{initials(pic.nama)}</AvatarFallback></Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{pic.nama}</p>
          <p className="truncate text-xs text-muted-foreground">{pic.jabatan}</p>
        </div>
      </div>
      <div className="mt-2.5 grid gap-1 text-xs">
        <a href={`tel:${pic.telepon}`} className="font-mono text-muted-foreground hover:text-foreground">{pic.telepon}</a>
        <a href={`mailto:${pic.email}`} className="truncate text-primary hover:underline">{pic.email}</a>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="col-span-2 text-sm break-words hyphens-none">{value}</dd>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{children}</h3>;
}

function PerusahaanDetail({ p }: { p: Perusahaan }) {
  const m = p.metrik;
  return (
    <div className="space-y-6 px-4 pb-8">
      <section>
        <SectionLabel>Ringkasan</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Penawaran" value={String(m.jumlahPenawaran)} icon={FileText} />
          <Stat label="Proyek Aktif" value={String(m.proyekAktif)} icon={FolderKanban} />
          <Stat label="Nilai Kontrak" value={formatRupiahCompact(m.nilaiKontrak)} title={formatRupiah(m.nilaiKontrak)} icon={Wallet} mono />
          <Stat label="Piutang" value={formatRupiahCompact(m.piutang)} title={formatRupiah(m.piutang)} icon={Receipt} mono />
        </div>
      </section>

      <section>
        <SectionLabel>Kontak PIC ({p.pic.length})</SectionLabel>
        <div className="grid gap-2">
          {p.pic.map((pic) => <PicCard key={pic.email} pic={pic} />)}
        </div>
      </section>

      <section>
        <SectionLabel>Informasi Perusahaan</SectionLabel>
        <dl className="divide-y divide-border">
          <InfoRow label="NPWP" value={<span className="font-mono">{p.npwp}</span>} />
          <InfoRow label="Alamat" value={p.alamat} />
          <InfoRow label="Kota" value={p.kota} />
          <InfoRow label="Telepon" value={<span className="font-mono">{p.telepon}</span>} />
          <InfoRow label="Email" value={<a href={`mailto:${p.email}`} className="text-primary hover:underline">{p.email}</a>} />
        </dl>
      </section>
    </div>
  );
}

export default function PerusahaanPage() {
  const { data, isLoading, isError, refetch } = usePerusahaanList();
  const [selected, setSelected] = useState<Perusahaan | null>(null);
  const columns = makeColumns(setSelected);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Building2 className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Perusahaan</h1>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          searchColumn="nama"
          searchPlaceholder="Cari nama perusahaan…"
          emptyMessage="Belum ada perusahaan"
        />
      )}

      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader className="pr-10">
                <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Building2 className="size-5" />
                </div>
                <SheetTitle className="text-lg leading-tight font-semibold break-words">
                  {selected.nama}
                </SheetTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <SheetDescription className="font-mono text-sm text-muted-foreground">
                    {selected.id}
                  </SheetDescription>
                  <StatusBadge status={selected.status} />
                </div>
              </SheetHeader>
              <PerusahaanDetail p={selected} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
