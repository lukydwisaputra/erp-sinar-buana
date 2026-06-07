"use client";

import {
  InfoIcon,
  TriangleAlertIcon,
  CircleCheckIcon,
  CircleAlertIcon,
  FileTextIcon,
} from "lucide-react";
import { toast } from "sonner";

import { ShowcaseSection } from "@/components/design-system/showcase-section";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";

/* ---------- DS-32 Alert (inline banner) ---------- */
function AlertShowcase() {
  return (
    <div className="flex w-full max-w-xl flex-col gap-3">
      <Alert variant="info">
        <InfoIcon />
        <AlertTitle>Sinkronisasi berjalan</AlertTitle>
        <AlertDescription>
          Data stok sedang diperbarui dari gudang. Beberapa angka mungkin
          tertunda beberapa menit.
        </AlertDescription>
      </Alert>

      <Alert variant="warning">
        <TriangleAlertIcon />
        <AlertTitle>Stok menipis</AlertTitle>
        <AlertDescription>
          5 produk berada di bawah ambang batas minimum. Pertimbangkan untuk
          membuat pesanan pembelian.
        </AlertDescription>
      </Alert>

      <Alert variant="success">
        <CircleCheckIcon />
        <AlertTitle>Faktur berhasil diterbitkan</AlertTitle>
        <AlertDescription>
          Faktur FK/001/5.2026 telah dikirim ke PT Maju Bersama Abadi.
        </AlertDescription>
      </Alert>

      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>3 faktur jatuh tempo</AlertTitle>
        <AlertDescription>
          Tiga faktur telah melewati tanggal jatuh tempo. Segera tindak lanjuti
          penagihan ke pelanggan terkait.
        </AlertDescription>
      </Alert>
    </div>
  );
}

/* ---------- DS-33 Toast (sonner) ---------- */
function ToastShowcase() {
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        onClick={() =>
          toast.success("Faktur berhasil disimpan", {
            description: "FK/001/5.2026 telah diterbitkan.",
          })
        }
      >
        Sukses
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.error("Gagal menyimpan faktur", {
            description: "Periksa koneksi lalu coba lagi.",
          })
        }
      >
        Galat
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.info("Stok sedang disinkronkan", {
            description: "Angka akan diperbarui dalam beberapa menit.",
          })
        }
      >
        Info
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.warning("Stok produk menipis", {
            description: "5 produk di bawah ambang minimum.",
          })
        }
      >
        Peringatan
      </Button>
      <Button variant="outline" onClick={() => toast("Demo: tidak disimpan")}>
        Polos
      </Button>
    </div>
  );
}

/* ---------- DS-34 Skeleton + Spinner ---------- */
function SkeletonCardSkeleton() {
  return (
    <div className="flex w-72 flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-md" />
    </div>
  );
}

function SkeletonSpinnerShowcase() {
  return (
    <div className="flex flex-wrap items-center gap-8">
      <SkeletonCardSkeleton />
      <div className="flex flex-col items-center gap-2 text-muted-foreground">
        {/* Design rule: a spinner must stay visible ~300ms minimum to avoid
            flicker. For this static demo it simply renders. */}
        <Spinner className="size-6 text-primary" />
        <span className="text-xs">Memuat…</span>
      </div>
    </div>
  );
}

/* ---------- DS-35 Empty state ---------- */
function EmptyStateShowcase() {
  return (
    <div className="w-full max-w-md">
      <EmptyState
        icon={FileTextIcon}
        title="Belum ada penawaran"
        description="Penawaran (SPH) yang Anda buat akan muncul di sini. Mulai dengan membuat penawaran pertama untuk pelanggan."
        action={
          <Button onClick={() => toast("Demo: tidak disimpan")}>
            Buat SPH pertama
          </Button>
        }
      />
    </div>
  );
}

/* ---------- DS-36 Error / retry block ---------- */
function ErrorStateShowcase() {
  return (
    <div className="w-full max-w-md">
      <ErrorState
        onRetry={() => toast.info("Memuat ulang…", { description: "Demo." })}
      />
    </div>
  );
}

/* ---------- Section assembly ---------- */
export function FeedbackSection() {
  return (
    <>
      <ShowcaseSection
        id="feedback-alert"
        title="Banner Inline (Alert)"
        description="Banner kontekstual dengan empat intensi — info, peringatan, sukses, dan galat — masing-masing dengan warna, teks, dan ikon Lucide. Kontras AA pada kedua tema."
      >
        <AlertShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="feedback-toast"
        title="Notifikasi Sembul (Toast)"
        description="Pemberitahuan sembul (sonner) untuk umpan balik aksi. Toaster dipasang sekali secara global di root layout."
      >
        <ToastShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="feedback-loading"
        title="Status Memuat"
        description="Kerangka (skeleton) menyerupai tata letak kartu nyata, dan pemintal (spinner) untuk pemuatan singkat. Aturan: pemintal tampil minimal ~300ms agar tidak berkedip."
      >
        <SkeletonSpinnerShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="feedback-empty"
        title="Keadaan Kosong"
        description="Panel saat belum ada data, dengan ikon, judul, deskripsi, dan ajakan tindakan utama. Komponen EmptyState dapat dipakai ulang."
      >
        <EmptyStateShowcase />
      </ShowcaseSection>

      <ShowcaseSection
        id="feedback-error"
        title="Keadaan Galat"
        description="Panel kegagalan dengan tombol 'Coba lagi' — secara visual berbeda dari keadaan kosong (ini kegagalan, bukan ketiadaan data). Komponen ErrorState dapat dipakai ulang."
      >
        <ErrorStateShowcase />
      </ShowcaseSection>
    </>
  );
}
