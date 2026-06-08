"use client";
import { useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Users, Wallet, HandCoins, Gauge, CalendarDays } from "lucide-react";
import { DataTable } from "@/components/shared/data-table";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { StatTile, InfoRow, InfoList, SectionLabel, initials } from "@/components/shared/detail-drawer";
import { formatRupiah, formatRupiahCompact } from "@/lib/format";
import { useKaryawanList } from "@/lib/query/karyawan";
import type { Karyawan } from "@/lib/schemas/karyawan";

const KEPEGAWAIAN: Record<Karyawan["statusKepegawaian"], { label: string; variant: "success" | "info" | "warning" }> = {
  tetap: { label: "Tetap", variant: "success" },
  kontrak: { label: "Kontrak", variant: "info" },
  probation: { label: "Magang", variant: "warning" },
};

function KepegawaianBadge({ status }: { status: Karyawan["statusKepegawaian"] }) {
  const k = KEPEGAWAIAN[status];
  return <Badge variant={k.variant}>{k.label}</Badge>;
}

function masaKerja(isoDate: string): string {
  const start = new Date(isoDate);
  const years = Math.floor((Date.now() - start.getTime()) / (365.25 * 24 * 3600 * 1000));
  return years <= 0 ? "< 1 tahun" : `${years} tahun`;
}

function tanggalID(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

function makeColumns(onOpen: (k: Karyawan) => void): ColumnDef<Karyawan>[] {
  return [
    {
      accessorKey: "id", header: "ID", meta: { mono: true },
      cell: ({ row }) => (
        <button type="button" onClick={() => onOpen(row.original)}
          className="rounded-sm font-mono text-primary hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.id}
        </button>
      ),
    },
    {
      accessorKey: "nama", header: "Nama",
      cell: ({ row }) => (
        <button type="button" onClick={() => onOpen(row.original)}
          className="rounded-sm text-left font-medium hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
          {row.original.nama}
        </button>
      ),
    },
    { accessorKey: "jabatan", header: "Jabatan" },
    {
      accessorKey: "statusKepegawaian", header: "Status",
      cell: ({ row }) => <KepegawaianBadge status={row.original.statusKepegawaian} />,
    },
    {
      accessorKey: "tanggalMasuk", header: "Tanggal Masuk",
      cell: ({ row }) => tanggalID(row.original.tanggalMasuk),
    },
  ];
}

function KaryawanDetail({ k }: { k: Karyawan }) {
  return (
    <div className="space-y-6 px-4 pb-8">
      <section>
        <SectionLabel>Ringkasan</SectionLabel>
        <div className="grid grid-cols-2 gap-2">
          <StatTile label="Gaji Pokok" value={formatRupiahCompact(k.gajiPokok)} title={formatRupiah(k.gajiPokok)} icon={Wallet} mono />
          <StatTile label="Tunjangan" value={formatRupiahCompact(k.tunjangan)} title={formatRupiah(k.tunjangan)} icon={HandCoins} mono />
          <StatTile label="Pengali" value={`${k.pengali.toLocaleString("id-ID")}×`} icon={Gauge} mono />
          <StatTile label="Masa Kerja" value={masaKerja(k.tanggalMasuk)} icon={CalendarDays} />
        </div>
      </section>

      <section>
        <SectionLabel>Data Karyawan</SectionLabel>
        <InfoList>
          <InfoRow label="Jabatan" value={k.jabatan} />
          <InfoRow label="NPWP" value={<span className="font-mono">{k.npwp}</span>} />
          <InfoRow label="Bank" value={`${k.bank.nama} • ${k.bank.nomor}`} />
          <InfoRow label="a.n." value={k.bank.atasNama} />
          <InfoRow label="Email" value={<a href={`mailto:${k.email}`} className="text-primary hover:underline">{k.email}</a>} />
          <InfoRow label="Tanggal Masuk" value={tanggalID(k.tanggalMasuk)} />
        </InfoList>
      </section>
    </div>
  );
}

export default function KaryawanPage() {
  const { data, isLoading, isError, refetch } = useKaryawanList();
  const [selected, setSelected] = useState<Karyawan | null>(null);
  const columns = makeColumns(setSelected);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="size-5 text-muted-foreground" />
        <h1 className="text-xl font-semibold tracking-tight">Karyawan</h1>
      </div>

      {isError ? (
        <ErrorState onRetry={() => refetch()} />
      ) : (
        <DataTable columns={columns} data={data ?? []} loading={isLoading}
          searchColumn="nama" searchPlaceholder="Cari nama karyawan…" emptyMessage="Belum ada karyawan" />
      )}

      <Sheet open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <SheetContent className="overflow-y-auto sm:max-w-md">
          {selected && (
            <>
              <SheetHeader className="pr-10">
                <Avatar className="mb-1 size-10"><AvatarFallback>{initials(selected.nama)}</AvatarFallback></Avatar>
                <SheetTitle className="text-lg leading-tight font-semibold break-words">{selected.nama}</SheetTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <SheetDescription className="font-mono text-sm text-muted-foreground">{selected.id}</SheetDescription>
                  <KepegawaianBadge status={selected.statusKepegawaian} />
                </div>
              </SheetHeader>
              <KaryawanDetail k={selected} />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
