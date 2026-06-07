import * as React from "react";
import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";

export type EmptyStateProps = {
  /** Lucide icon component shown in the media slot. */
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Optional CTA(s) — e.g. a primary <Button>. */
  action?: React.ReactNode;
  className?: string;
};

/**
 * Reusable empty-state panel for "no records yet" surfaces.
 * Wraps the shadcn `empty` primitive with a minimal, clean prop interface.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <Empty className={cn("border", className)}>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  );
}
