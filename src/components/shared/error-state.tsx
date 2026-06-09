"use client";
import * as React from "react";
import { CircleAlertIcon, RotateCwIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { usePending } from "@/lib/use-pending";

export type ErrorStateProps = {
  /** Called when the user clicks "Coba lagi". */
  onRetry: () => void;
  title?: string;
  description?: string;
  /** Label for the retry button. Defaults to "Coba lagi". */
  retryLabel?: string;
  className?: string;
};

/**
 * Reusable error / retry panel — visually distinct from EmptyState: a solid
 * destructive-tinted banner (this is a failure, not an absence of data).
 */
export function ErrorState({
  onRetry,
  title = "Gagal memuat data",
  description = "Terjadi kesalahan saat mengambil data. Periksa koneksi Anda lalu coba lagi.",
  retryLabel = "Coba lagi",
  className,
}: ErrorStateProps) {
  const [retrying, run] = usePending();
  return (
    <div
      role="alert"
      className={cn(
        "flex w-full flex-col items-center gap-3 rounded-lg border border-transparent bg-badge-destructive px-4 py-6 text-center text-badge-destructive-foreground",
        className
      )}
    >
      <CircleAlertIcon className="size-6 shrink-0" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-badge-destructive-foreground/90">
          {description}
        </p>
      </div>
      <Button variant="outline" size="sm" loading={retrying} onClick={() => run(onRetry)}>
        {!retrying && <RotateCwIcon />}
        {retryLabel}
      </Button>
    </div>
  );
}
