"use client";
import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** Common dialing codes; Indonesia first (default). Text-only — no flag emoji (design rule). */
const COUNTRY_CODES = [
  { code: "+62", short: "ID" },
  { code: "+60", short: "MY" },
  { code: "+65", short: "SG" },
  { code: "+61", short: "AU" },
  { code: "+1", short: "US" },
] as const;

/**
 * Phone field: a leading country-code picker (native <select>, default Indonesia
 * +62) and the local number input, rendered as one bordered control. A native
 * select is used so it opens reliably inside dialogs/sheets. Forwards ref + props
 * to the number input for RHF `{...register(...)}`. The code is local UI state
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
        <div className="relative flex h-full items-center">
          <select
            value={code}
            onChange={(e) => setCode(e.target.value)}
            aria-label="Kode negara"
            className="h-full cursor-pointer appearance-none rounded-l-lg bg-transparent py-0 pr-6 pl-2.5 font-mono text-sm tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:bg-transparent"
          >
            {COUNTRY_CODES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} {c.short}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="pointer-events-none absolute right-1.5 size-3.5 text-muted-foreground" />
        </div>
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
