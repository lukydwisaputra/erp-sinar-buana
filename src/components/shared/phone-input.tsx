"use client";
import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";

/** Common dialing codes; Indonesia first (default). Text-only — no flag emoji (design rule). */
const COUNTRY_CODES = [
  { code: "+62", label: "Indonesia (+62)" },
  { code: "+60", label: "Malaysia (+60)" },
  { code: "+65", label: "Singapura (+65)" },
  { code: "+61", label: "Australia (+61)" },
  { code: "+1", label: "Amerika Serikat (+1)" },
] as const;

/**
 * Phone field: a leading country-code selector (default Indonesia +62) and the
 * local number input, rendered as one bordered control. Built as siblings (not
 * an input-group addon) so the Select opens reliably. Forwards ref + props to
 * the number input for RHF `{...register(...)}`. The code is local UI state
 * (prototype — not persisted).
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function PhoneInput({ className, "aria-invalid": ariaInvalid, ...props }, ref) {
    const [code, setCode] = React.useState("+62");
    return (
      <div
        data-invalid={ariaInvalid ? "true" : undefined}
        className={cn(
          "flex h-9 w-full items-center rounded-lg border border-input bg-transparent text-sm transition-colors dark:bg-input/30",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          "data-[invalid=true]:border-destructive data-[invalid=true]:ring-[3px] data-[invalid=true]:ring-destructive/20",
        )}
      >
        <Select value={code} onValueChange={setCode}>
          <SelectTrigger
            aria-label="Kode negara"
            className="h-full shrink-0 gap-1 rounded-l-lg rounded-r-none border-0 bg-transparent px-2.5 font-mono tabular-nums shadow-none focus-visible:ring-0 dark:bg-transparent"
          >
            <span>{code}</span>
          </SelectTrigger>
          <SelectContent>
            {COUNTRY_CODES.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="h-5 w-px shrink-0 bg-border" aria-hidden />
        <input
          ref={ref}
          inputMode="tel"
          aria-invalid={ariaInvalid}
          className={cn(
            "h-full min-w-0 flex-1 rounded-r-lg bg-transparent px-3 outline-none placeholder:text-muted-foreground",
            className,
          )}
          {...props}
        />
      </div>
    );
  },
);
