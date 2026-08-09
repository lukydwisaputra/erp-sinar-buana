"use client";
import { InfoIcon } from "lucide-react";
import { Card, CardAction, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverHeader, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { MaskedValue } from "@/components/shared/masked-value";

/** Structured explanation shown in a stat card's info popover — what the
 * number means, how it's derived, and which records feed it. */
export type StatCardInfo = {
  definisi: string;
  basisPerhitungan: string;
  sumberData: string[];
};

function StatCardInfoButton({ label, info }: { label: string; info: StatCardInfo }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-6 text-muted-foreground hover:text-foreground"
          aria-label={`Info: ${label}`}
        >
          <InfoIcon className="size-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <PopoverHeader>
          <PopoverTitle>{label}</PopoverTitle>
        </PopoverHeader>
        <p className="text-sm text-muted-foreground">{info.definisi}</p>
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Basis Perhitungan</p>
          <p className="text-sm">{info.basisPerhitungan}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">Sumber Data</p>
          <ul className="list-disc pl-4 text-sm marker:text-muted-foreground">
            {info.sumberData.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function StatCard({
  label,
  value,
  sub,
  info,
  sensitive = true,
}: {
  label: string;
  value: string | undefined;
  sub?: React.ReactNode;
  /** Structured content for the info popover; omit to render the card with no info icon. */
  info?: StatCardInfo;
  sensitive?: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardDescription className="text-xs tracking-wide uppercase">{label}</CardDescription>
        {info && (
          <CardAction>
            <StatCardInfoButton label={label} info={info} />
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {value === undefined ? (
          <Skeleton className="h-7 w-28" />
        ) : (
          <p className="font-mono text-2xl font-semibold tabular-nums text-foreground">
            {sensitive ? <MaskedValue>{value}</MaskedValue> : value}
          </p>
        )}
        {sub}
      </CardContent>
    </Card>
  );
}
