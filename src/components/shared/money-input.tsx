"use client";

import * as React from "react";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import { parseRupiah } from "@/lib/format";
import { terbilang } from "@/lib/terbilang";

export function MoneyInput({
  defaultValue = 0,
  onValueChange,
  showTerbilang = true,
  className,
}: {
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  showTerbilang?: boolean;
  className?: string;
}) {
  const [value, setValue] = React.useState(defaultValue);
  const [text, setText] = React.useState(
    defaultValue ? defaultValue.toLocaleString("id-ID") : ""
  );

  return (
    <div className={className ?? "w-72"}>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>Rp</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          inputMode="numeric"
          aria-label="Jumlah uang"
          className="text-right font-mono tabular-nums"
          value={text}
          onChange={(e) => {
            const n = parseRupiah(e.target.value);
            setValue(n);
            setText(e.target.value);
            onValueChange?.(n);
          }}
          onBlur={() =>
            setText(value ? value.toLocaleString("id-ID") : "")
          }
        />
      </InputGroup>
      {showTerbilang && (
        <p className="mt-1 text-xs capitalize text-muted-foreground">
          {value ? `${terbilang(value)} rupiah` : "—"}
        </p>
      )}
    </div>
  );
}
