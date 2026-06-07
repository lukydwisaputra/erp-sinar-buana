import { Construction, type LucideIcon } from "lucide-react";

export function PagePlaceholder({ title, icon: Icon = Construction, note }: {
  title: string; icon?: LucideIcon; note?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-muted">
        <Icon className="size-6 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        {note ?? "Layar ini akan dibangun pada Fase 2 prototipe."}
      </p>
    </div>
  );
}
