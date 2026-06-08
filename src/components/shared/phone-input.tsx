"use client";
import * as React from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
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
 * Phone field: a leading country-code selector (default Indonesia +62) inside an
 * input group, followed by the local number input. Forwards ref + props to the
 * number input so it works with RHF `{...register(...)}`. The selected code is
 * local UI state (prototype — not persisted).
 */
export const PhoneInput = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  function PhoneInput({ className, ...props }, ref) {
    const [code, setCode] = React.useState("+62");
    return (
      <InputGroup>
        <InputGroupAddon align="inline-start" className="pr-0 pl-1">
          <Select value={code} onValueChange={setCode}>
            <SelectTrigger
              aria-label="Kode negara"
              className="h-7 gap-1 border-0 bg-transparent px-1.5 font-mono text-sm tabular-nums shadow-none focus-visible:ring-0 dark:bg-transparent"
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
        </InputGroupAddon>
        <InputGroupInput ref={ref} inputMode="tel" className={className} {...props} />
      </InputGroup>
    );
  },
);
