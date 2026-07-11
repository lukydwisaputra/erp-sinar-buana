import { NextResponse } from "next/server";
import { queryClient } from "@/lib/db/client";

/** No auth, no session lookup — this is a liveness probe (Docker
 * HEALTHCHECK / Coolify), not a data endpoint. A raw `select 1` on the
 * unauthenticated connection is enough to prove the app can reach Postgres;
 * it deliberately does not open an RLS transaction. */
export async function GET() {
  try {
    await queryClient`select 1`;
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ status: "error", error: message }, { status: 503 });
  }
}
