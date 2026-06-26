import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { LucideIcon } from "lucide-react";

export function initials(name: string) {
  return name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </h3>
  );
}

/** A KPI tile for the drawer summary grid. `title` overrides the hover tooltip (e.g. exact money). */
export function StatTile({ label, value, icon: Icon, mono, title }: {
  label: string; value: string; icon: LucideIcon; mono?: boolean; title?: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <p
        className={cn("mt-1 truncate text-base font-semibold text-foreground", mono && "font-mono tabular-nums")}
        title={title ?? value}
      >
        {value}
      </p>
    </div>
  );
}

export function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-3 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="col-span-2 break-words hyphens-none text-sm">{value}</dd>
    </div>
  );
}

/** Wraps InfoRow children in a divided <dl>. */
export function InfoList({ children }: { children: React.ReactNode }) {
  return <dl className="divide-y divide-border">{children}</dl>;
}

/** A person card: avatar initials + name + role + phone/email. Used for PICs. */
export function ContactCard({ name, role, phone, email }: {
  name: string; role: string; phone: string; email: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center gap-2.5">
        <Avatar className="size-9"><AvatarFallback className="text-xs">{initials(name)}</AvatarFallback></Avatar>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{name}</p>
          <p className="truncate text-xs text-muted-foreground">{role}</p>
        </div>
      </div>
      <div className="mt-2.5 grid gap-1 text-xs">
        <a href={`tel:${phone}`} className="font-mono text-muted-foreground hover:text-foreground">{phone}</a>
        <a href={`mailto:${email}`} className="truncate text-[var(--link)] hover:underline">{email}</a>
      </div>
    </div>
  );
}
