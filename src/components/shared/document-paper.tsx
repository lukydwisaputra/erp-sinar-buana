import * as React from "react";
import { cn } from "@/lib/utils";

/** A "paper" surface for document previews (SPH, Invoice). */
export function DocumentPaper({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("rounded-lg border border-border bg-card text-card-foreground shadow-sm", className)}>
      <div className="space-y-6 p-6 sm:p-8">{children}</div>
    </div>
  );
}
