import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { settleTaxEntry, unsettleTaxEntry, updateBuktiPotong } from "@/lib/tax/service";
import { settleTaxEntrySchema } from "@/lib/schemas/tax-entries";
import { errorResponse } from "@/lib/api-error";

const patchBodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("settle") }).extend(settleTaxEntrySchema.shape),
  z.object({ action: z.literal("unsettle") }),
  z.object({ action: z.literal("bukti-potong"), received: z.boolean() }),
]);

/** Same role set as GET /api/tax-entries (`is_finance()`, matches `tax_write`). */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan");
    const { id } = await params;
    const body = patchBodySchema.parse(await request.json());

    if (body.action === "settle") {
      const { settledDate, notes, buktiPotongReceived } = body;
      const entry = await settleTaxEntry(session.id, id, { settledDate, notes, buktiPotongReceived });
      return NextResponse.json(entry);
    }
    if (body.action === "unsettle") {
      const entry = await unsettleTaxEntry(session.id, id);
      return NextResponse.json(entry);
    }
    const entry = await updateBuktiPotong(session.id, id, body.received);
    return NextResponse.json(entry);
  } catch (error) {
    return errorResponse(error);
  }
}
