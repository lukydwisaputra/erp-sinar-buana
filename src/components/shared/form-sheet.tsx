"use client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { usePending } from "@/lib/use-pending";
import { cn } from "@/lib/utils";

/**
 * Presentational shell for the "Tambah" create forms.
 * Keeps header/footer/scroll behaviour consistent across the three master-data pages.
 */
export function FormSheet({
  open,
  onOpenChange,
  title,
  description,
  onSubmit,
  submitLabel = "Simpan",
  submitDisabled = false,
  className,
  children,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel?: string;
  submitDisabled?: boolean;
  /** Override the default sm:max-w-md width — wider forms (e.g. multi-column step rows). */
  className?: string;
  children: React.ReactNode;
}) {
  const [submitting, run] = usePending();
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={cn("flex flex-col overflow-hidden sm:max-w-md", className)}>
        <SheetHeader className="pr-10">
          <SheetTitle className="text-lg font-semibold">{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <form onSubmit={(e) => run(() => onSubmit(e))} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto px-4 pb-2">
            {children}
          </div>
          <SheetFooter className="flex-row justify-end gap-2 border-t border-border">
            <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
              Batal
            </Button>
            <Button type="submit" loading={submitting} disabled={submitDisabled}>{submitLabel}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
