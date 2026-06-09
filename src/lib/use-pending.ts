"use client";
import * as React from "react";

/**
 * Tracks the in-flight state of an async action so a button can show a spinner
 * and disable itself while the (mock) API call runs.
 *
 *   const [pending, run] = usePending();
 *   <Button loading={pending} onClick={() => run(submit)}>Simpan</Button>
 */
export function usePending(): readonly [boolean, (fn: () => void | Promise<void>) => Promise<void>] {
  const [pending, setPending] = React.useState(false);
  const run = React.useCallback(async (fn: () => void | Promise<void>) => {
    setPending(true);
    try {
      await fn();
    } finally {
      setPending(false);
    }
  }, []);
  return [pending, run] as const;
}
