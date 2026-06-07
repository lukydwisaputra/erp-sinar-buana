"use client";

import * as React from "react";
import {
  MoreVerticalIcon,
  EyeIcon,
  PencilIcon,
  DownloadIcon,
  BanIcon,
  InfoIcon,
  FilterIcon,
  CircleCheckIcon,
  Loader2Icon,
  MailIcon,
  PhoneIcon,
  BuildingIcon,
  SearchIcon,
  LayoutDashboardIcon,
  FileTextIcon,
  ReceiptIcon,
  FilePlusIcon,
} from "lucide-react";

import { ShowcaseSection } from "@/components/design-system/showcase-section";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

/* ---------- DS-25 Dialog ---------- */
function DialogShowcase() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Tambah kategori</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah kategori</DialogTitle>
          <DialogDescription>
            Buat kategori produk baru untuk mengelompokkan barang.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-1">
          <div className="grid gap-1.5">
            <Label htmlFor="kategori-nama">Nama kategori</Label>
            <Input id="kategori-nama" placeholder="mis. Bahan baku" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="kategori-ket">Keterangan</Label>
            <Textarea
              id="kategori-ket"
              placeholder="Deskripsi singkat (opsional)"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Batal</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button>Simpan</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- DS-26 Alert-dialog ---------- */
function AlertDialogShowcase() {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="outline">Nonaktifkan akun</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Nonaktifkan akun?</AlertDialogTitle>
          <AlertDialogDescription>
            Akun pengguna ini akan dinonaktifkan dan tidak dapat masuk lagi.
            Data dan riwayat transaksinya tetap tersimpan dan dapat diaktifkan
            kembali kapan saja.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction variant="destructive">
            Nonaktifkan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/* ---------- DS-27 Sheet — detail drawer + timeline ---------- */
type TimelineStep = {
  label: string;
  actor: string;
  timestamp: string;
  state: "done" | "in-progress";
};

const TIMELINE: TimelineStep[] = [
  {
    label: "Menunggu persetujuan manajer",
    actor: "Sistem",
    timestamp: "7 Jun 2026, 09:14",
    state: "in-progress",
  },
  {
    label: "Faktur diterbitkan",
    actor: "Siti Aminah",
    timestamp: "6 Jun 2026, 16:40",
    state: "done",
  },
  {
    label: "SPH disetujui pelanggan",
    actor: "Budi Santoso",
    timestamp: "5 Jun 2026, 11:02",
    state: "done",
  },
  {
    label: "Penawaran (SPH) dibuat",
    actor: "Rina Wijaya",
    timestamp: "3 Jun 2026, 08:25",
    state: "done",
  },
];

type LineItem = { nama: string; qty: number; satuan: string; harga: number };

const LINE_ITEMS: LineItem[] = [
  { nama: "Semen Portland 50kg", qty: 120, satuan: "sak", harga: 8_400_000 },
  { nama: "Besi beton ulir 10mm", qty: 40, satuan: "batang", harga: 5_600_000 },
  { nama: "Pasir cor (truk)", qty: 3, satuan: "rit", harga: 4_750_000 },
];

function DrawerTimeline() {
  return (
    <ol className="relative flex flex-col gap-5">
      {TIMELINE.map((step, i) => {
        const last = i === TIMELINE.length - 1;
        return (
          <li key={step.label} className="relative flex gap-3 pb-0">
            {!last && (
              <span
                aria-hidden
                className="absolute top-6 left-[11px] h-[calc(100%+0.25rem)] w-px bg-border"
              />
            )}
            <span className="relative z-10 mt-0.5 flex size-6 shrink-0 items-center justify-center">
              {step.state === "done" ? (
                <CircleCheckIcon className="size-5 text-success" />
              ) : (
                <Loader2Icon className="size-5 animate-spin text-info" />
              )}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {step.label}
              </span>
              <span className="text-xs text-muted-foreground">
                {step.actor} · {step.timestamp}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function DetailDrawerShowcase() {
  const total = LINE_ITEMS.reduce((s, it) => s + it.harga, 0);
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Lihat rincian faktur</Button>
      </SheetTrigger>
      <SheetContent className="w-full gap-0 overflow-y-auto sm:max-w-md">
        <SheetHeader className="gap-1">
          <SheetTitle className="font-mono text-base tracking-tight">
            FK/001/5.2026
          </SheetTitle>
          <SheetDescription>
            Faktur penjualan — PT Maju Bersama Abadi
          </SheetDescription>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="warning">
              <Loader2Icon className="size-3 animate-spin" />
              Menunggu persetujuan
            </Badge>
            <Badge variant="info">
              <FileTextIcon className="size-3" />
              Termin 30 hari
            </Badge>
          </div>
        </SheetHeader>

        <Separator />

        <div className="flex flex-col gap-4 p-4">
          {/* Perusahaan */}
          <section className="flex flex-col gap-2">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              <BuildingIcon className="size-3.5" />
              Perusahaan
            </h3>
            <div className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">
                PT Maju Bersama Abadi
              </span>
              <a
                href="mailto:pembelian@majubersama.co.id"
                className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
              >
                <MailIcon className="size-3.5" />
                pembelian@majubersama.co.id
              </a>
              <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <PhoneIcon className="size-3.5" />
                (021) 5550-1234
              </span>
            </div>
          </section>

          <Separator />

          {/* Timeline */}
          <section className="flex flex-col gap-3">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Riwayat
            </h3>
            <DrawerTimeline />
          </section>

          <Separator />

          {/* Line items */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Rincian barang
            </h3>
            <ul className="flex flex-col divide-y divide-border">
              {LINE_ITEMS.map((it) => (
                <li
                  key={it.nama}
                  className="flex items-center justify-between gap-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-foreground">{it.nama}</span>
                    <span className="text-xs text-muted-foreground">
                      {it.qty} {it.satuan}
                    </span>
                  </div>
                  <span className="font-mono text-sm tabular-nums text-foreground">
                    {formatRupiah(it.harga)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between border-t border-border pt-2">
              <span className="text-sm font-medium">Total</span>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {formatRupiah(total)}
              </span>
            </div>
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ---------- DS-28 Dropdown menu ---------- */
function DropdownMenuShowcase() {
  return (
    <div className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
      <span className="font-mono text-sm">FK-2026-0142</span>
      <span className="text-sm text-muted-foreground">PT Maju Bersama Abadi</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Aksi baris">
            <MoreVerticalIcon />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuLabel>Aksi</DropdownMenuLabel>
          <DropdownMenuItem>
            <EyeIcon />
            Lihat
          </DropdownMenuItem>
          <DropdownMenuItem>
            <PencilIcon />
            Ubah
          </DropdownMenuItem>
          <DropdownMenuItem>
            <DownloadIcon />
            Unduh PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <BanIcon />
            Nonaktifkan
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ---------- DS-29 Tooltip / Popover ---------- */
function TooltipPopoverShowcase() {
  return (
    <TooltipProvider>
      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Info">
              <InfoIcon />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Nilai termasuk PPN 11%</TooltipContent>
        </Tooltip>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">
              <FilterIcon />
              Filter
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start">
            <PopoverHeader>
              <PopoverTitle>Saring faktur</PopoverTitle>
              <PopoverDescription>
                Batasi daftar berdasarkan rentang dan status.
              </PopoverDescription>
            </PopoverHeader>
            <Separator />
            <div className="grid gap-1.5">
              <Label htmlFor="filter-min">Jumlah minimum</Label>
              <Input
                id="filter-min"
                inputMode="numeric"
                placeholder="Rp 0"
                className="font-mono tabular-nums"
              />
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="success">Lunas</Badge>
              <Badge variant="warning">Tertunda</Badge>
              <Badge variant="destructive">Jatuh tempo</Badge>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm">
                Atur ulang
              </Button>
              <Button size="sm">Terapkan</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </TooltipProvider>
  );
}

/* ---------- DS-30 Hover card ---------- */
function HoverCardShowcase() {
  return (
    <p className="text-sm text-muted-foreground">
      Faktur untuk{" "}
      <HoverCard>
        <HoverCardTrigger asChild>
          <a
            href="#"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            PT Maju Bersama Abadi
          </a>
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-72">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-md bg-muted">
                <BuildingIcon className="size-4 text-muted-foreground" />
              </span>
              <div className="flex flex-col">
                <span className="text-sm font-medium text-foreground">
                  PT Maju Bersama Abadi
                </span>
                <span className="text-xs text-muted-foreground">
                  Pelanggan · Jakarta
                </span>
              </div>
            </div>
            <Separator />
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              <dt className="text-muted-foreground">NPWP</dt>
              <dd className="font-mono tabular-nums">01.234.567.8-901.000</dd>
              <dt className="text-muted-foreground">PIC</dt>
              <dd className="text-foreground">Bpk. Hendra Gunawan</dd>
              <dt className="text-muted-foreground">Telepon</dt>
              <dd className="text-foreground">(021) 5550-1234</dd>
            </dl>
          </div>
        </HoverCardContent>
      </HoverCard>{" "}
      jatuh tempo bulan ini.
    </p>
  );
}

/* ---------- DS-31 Command palette + Kbd ---------- */
function CommandPaletteShowcase() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="justify-between gap-8 text-muted-foreground"
      >
        <span className="inline-flex items-center gap-2">
          <SearchIcon className="size-4" />
          Cari atau jalankan perintah…
        </span>
        <KbdGroup>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
        </KbdGroup>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Palet perintah"
        description="Cari halaman atau jalankan aksi"
      >
        <CommandInput placeholder="Ketik perintah atau cari…" />
        <CommandList>
          <CommandEmpty>Tidak ada hasil.</CommandEmpty>
          <CommandGroup heading="Navigasi">
            <CommandItem onSelect={() => setOpen(false)}>
              <LayoutDashboardIcon />
              Dasbor
            </CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>
              <FileTextIcon />
              Penawaran
            </CommandItem>
            <CommandItem onSelect={() => setOpen(false)}>
              <ReceiptIcon />
              Faktur
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Aksi">
            <CommandItem onSelect={() => setOpen(false)}>
              <FilePlusIcon />
              Buat SPH
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

/* ---------- Section assembly ---------- */
export function OverlaySection() {
  return (
    <>
      <ShowcaseSection
        id="overlay-dialog"
        title="Dialog & Konfirmasi"
        description="Dialog formulir (tambah kategori) dan dialog konfirmasi destruktif. Sesuai BR-13, aksi 'hapus' sebenarnya menonaktifkan — disampaikan jujur dan dikonfirmasi."
      >
        <DialogShowcase />
        <AlertDialogShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="overlay-drawer"
        title="Panel Rincian (Sheet)"
        description="Laci sisi kanan untuk memeriksa satu record tanpa meninggalkan daftar: nomor mono, badge status, blok perusahaan, lini masa audit (centang hijau / pemintal), dan rincian barang mono rata kanan."
      >
        <DetailDrawerShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="overlay-menu"
        title="Menu Aksi Baris"
        description="Menu ⋮ untuk aksi per baris tabel; item destruktif memakai warna destructive."
      >
        <DropdownMenuShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="overlay-tooltip"
        title="Tooltip & Popover"
        description="Tooltip ringkas pada tombol ikon, dan popover dengan panel saring yang lebih kaya."
      >
        <TooltipPopoverShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="overlay-hovercard"
        title="Kartu Pratinjau"
        description="Pratinjau ringkasan perusahaan (NPWP, PIC, telepon) saat menyorot nama perusahaan."
      >
        <HoverCardShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="overlay-command"
        title="Palet Perintah"
        description="Dialog perintah ⌘K dengan aksi navigasi & aksi cepat, beserta petunjuk tombol (Kbd). Tekan ⌘K / Ctrl+K untuk membuka."
      >
        <CommandPaletteShowcase />
      </ShowcaseSection>
    </>
  );
}
