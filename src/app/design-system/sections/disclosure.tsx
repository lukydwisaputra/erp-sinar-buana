"use client";

import * as React from "react";
import {
  BoldIcon,
  StarIcon,
  TableIcon,
  KanbanIcon,
  GanttChartIcon,
  ChevronDownIcon,
} from "lucide-react";

import { ShowcaseSection } from "@/components/design-system/showcase-section";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

/* ---------- DS-37 Tabs ---------- */
function TabsShowcase() {
  return (
    <Tabs defaultValue="ringkasan" className="w-full max-w-xl">
      <TabsList>
        <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
        <TabsTrigger value="termin">Termin</TabsTrigger>
        <TabsTrigger value="dokumen">Dokumen</TabsTrigger>
      </TabsList>

      <TabsContent
        value="ringkasan"
        className="rounded-lg border border-border bg-card p-4 text-sm"
      >
        <p className="font-medium">SPH/001/5.2026 — PT Maju Bersama Abadi</p>
        <p className="mt-1 text-muted-foreground">
          Nilai penawaran Rp 124.500.000, berlaku hingga 30 Juni 2026. Status
          saat ini: menunggu persetujuan pelanggan.
        </p>
      </TabsContent>

      <TabsContent
        value="termin"
        className="rounded-lg border border-border bg-card p-4 text-sm"
      >
        <ul className="space-y-1 text-muted-foreground">
          <li>Uang muka 30% saat penerbitan PO.</li>
          <li>Pelunasan 70% sebelum pengiriman barang.</li>
          <li>Jatuh tempo pembayaran: 14 hari kalender.</li>
        </ul>
      </TabsContent>

      <TabsContent
        value="dokumen"
        className="rounded-lg border border-border bg-card p-4 text-sm"
      >
        <ul className="space-y-1 text-muted-foreground">
          <li>Surat Penawaran Harga (PDF)</li>
          <li>Spesifikasi teknis produk</li>
          <li>Syarat &amp; ketentuan penjualan</li>
        </ul>
      </TabsContent>
    </Tabs>
  );
}

/* ---------- DS-38 Accordion + Collapsible ---------- */
function AccordionShowcase() {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="penomoran"
      className="w-full max-w-xl rounded-lg border border-border bg-card px-4"
    >
      <AccordionItem value="penomoran">
        <AccordionTrigger>Format Penomoran</AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          Pola nomor dokumen: <code>SPH/{"{urut}"}/{"{bulan}"}.{"{tahun}"}</code>.
          Nomor urut diatur ulang setiap awal bulan.
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="pajak">
        <AccordionTrigger>Tarif Pajak</AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          PPN keluaran sebesar 11% diterapkan otomatis pada setiap faktur.
          Pengecualian dapat diatur per pelanggan.
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="workflow">
        <AccordionTrigger>Status Workflow</AccordionTrigger>
        <AccordionContent className="text-muted-foreground">
          Alur: Draf &rarr; Menunggu Persetujuan &rarr; Disetujui &rarr; Selesai.
          Hanya peran Manajer yang dapat menyetujui.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}

function CollapsibleShowcase() {
  const [open, setOpen] = React.useState(false);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="w-full max-w-xl rounded-lg border border-border bg-card p-4 text-sm"
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">Rincian Pengiriman</span>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-1">
            Lihat detail
            <ChevronDownIcon
              className="size-4 transition-transform data-[state=open]:rotate-180"
              data-state={open ? "open" : "closed"}
            />
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent className="mt-3 space-y-1 border-t border-border pt-3 text-muted-foreground">
        <p>Ekspedisi: JNE Trucking (JTR)</p>
        <p>Estimasi tiba: 3–5 hari kerja</p>
        <p>Alamat: Jl. Industri Raya No. 12, Bekasi</p>
        <p>Nomor resi: akan terbit setelah barang dikirim</p>
      </CollapsibleContent>
    </Collapsible>
  );
}

/* ---------- DS-39 Toggle + Toggle-group ---------- */
function ToggleShowcase() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Toggle aria-label="Tebalkan" variant="outline">
          <BoldIcon className="size-4" />
        </Toggle>
        <Toggle aria-label="Tandai favorit" variant="outline" defaultPressed>
          <StarIcon className="size-4" />
          Favorit
        </Toggle>
      </div>

      <ToggleGroup
        type="single"
        defaultValue="tabel"
        variant="outline"
        aria-label="Pilih tampilan"
      >
        <ToggleGroupItem value="tabel" aria-label="Tampilan tabel">
          <TableIcon className="size-4" />
          Tabel
        </ToggleGroupItem>
        <ToggleGroupItem value="papan" aria-label="Tampilan papan">
          <KanbanIcon className="size-4" />
          Papan
        </ToggleGroupItem>
        <ToggleGroupItem value="gantt" aria-label="Tampilan gantt">
          <GanttChartIcon className="size-4" />
          Gantt
        </ToggleGroupItem>
      </ToggleGroup>
    </div>
  );
}

/* ---------- DS-40 Breadcrumb ---------- */
function BreadcrumbShowcase() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Beranda</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex items-center gap-1"
              aria-label="Buka menu navigasi"
            >
              <BreadcrumbEllipsis />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem>Penjualan</DropdownMenuItem>
              <DropdownMenuItem>Pembelian</DropdownMenuItem>
              <DropdownMenuItem>Inventori</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="#">Penawaran</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>SPH/001/5.2026</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

/* ---------- DS-41 Scroll-area ---------- */
const AKTIVITAS = [
  "PT Maju Bersama Abadi membuat SPH/001/5.2026",
  "CV Sumber Rejeki menyetujui PO/045/5.2026",
  "Faktur FK/120/5.2026 diterbitkan untuk PT Sentosa Jaya",
  "Stok produk 'Pipa PVC 4 inci' diperbarui (+500)",
  "UD Karya Mandiri melunasi FK/118/5.2026",
  "Penawaran SPH/099/4.2026 kedaluwarsa",
  "PT Cahaya Logam menambah kontak baru",
  "Surat jalan SJ/210/5.2026 dicetak",
  "PT Mitra Sejati meminta revisi harga",
  "Pesanan pembelian PB/067/5.2026 dibuat",
  "Retur barang RT/008/5.2026 disetujui",
  "PT Anugerah Teknik melunasi sebagian FK/115/5.2026",
  "Produk baru 'Kawat Las RB 2.6mm' ditambahkan",
  "CV Berkah Abadi membatalkan PO/041/5.2026",
  "Penyesuaian stok gudang Bekasi dicatat",
  "PT Indah Permai mengunggah bukti transfer",
  "Laporan penjualan Mei 2026 dihasilkan",
  "PT Sumber Makmur memperbarui alamat penagihan",
  "Diskon pelanggan 'Grosir' diaktifkan",
  "PT Jaya Konstruksi membuat SPH/002/5.2026",
];

function ScrollAreaShowcase() {
  return (
    <ScrollArea className="h-64 w-full max-w-md rounded-lg border border-border bg-card">
      <div className="p-4">
        <h4 className="mb-3 text-sm font-medium">Aktivitas Terbaru</h4>
        <ul className="space-y-2 text-sm">
          {AKTIVITAS.map((item, i) => (
            <li
              key={i}
              className="border-b border-border pb-2 text-muted-foreground last:border-0 last:pb-0"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>
    </ScrollArea>
  );
}

/* ---------- Section assembly ---------- */
export function DisclosureSection() {
  return (
    <>
      <ShowcaseSection
        id="disclosure-tabs"
        title="Tab (Tabs)"
        description="Kelompok tab untuk membagi konten satu entitas menjadi beberapa panel. Tab aktif ditandai dengan jelas pada kedua tema."
      >
        <TabsShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="disclosure-accordion"
        title="Akordeon &amp; Collapsible"
        description="Akordeon (satu panel terbuka, dapat ditutup) untuk daftar konfigurasi, dan Collapsible mandiri untuk menyembunyikan detail tambahan di balik tombol 'Lihat detail'."
      >
        <div className="flex w-full flex-col gap-6">
          <AccordionShowcase />
          <CollapsibleShowcase />
        </div>
      </ShowcaseSection>

      <ShowcaseSection
        id="disclosure-toggle"
        title="Sakelar (Toggle) &amp; Grup Sakelar"
        description="Sakelar tunggal untuk aksi dua keadaan, dan grup sakelar sebagai pengalih tampilan (Tabel / Papan / Gantt). Keadaan terpilih terlihat jelas."
      >
        <ToggleShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="disclosure-breadcrumb"
        title="Remah Roti (Breadcrumb)"
        description="Navigasi hierarki tiga tingkat dengan menu sembul untuk tingkat yang diciutkan. Halaman saat ini ditandai sebagai teks non-tautan."
      >
        <BreadcrumbShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="disclosure-scrollarea"
        title="Area Gulir (Scroll Area)"
        description="Wadah bertinggi tetap dengan bilah gulir bertema. Berisi daftar panjang aktivitas terbaru sehingga bilah gulir kustom terlihat pada kedua tema."
      >
        <ScrollAreaShowcase />
      </ShowcaseSection>
    </>
  );
}
