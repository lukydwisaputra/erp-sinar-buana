import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { moveOption } from "@/lib/daftar-pilihan/service";
import { daftarPilihanKategori } from "@/lib/schemas/daftar-pilihan";
import { errorResponse } from "@/lib/api-error";

const bodySchema = z.object({ direction: z.enum(["up", "down"]) });

type RouteContext = { params: Promise<{ kategori: string; id: string }> };

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { kategori, id } = await params;
    const parsedKategori = daftarPilihanKategori.parse(kategori);
    const { direction } = bodySchema.parse(await request.json());
    const rows = await moveOption(session.id, parsedKategori, id, direction);
    return NextResponse.json(rows);
  } catch (error) {
    return errorResponse(error);
  }
}
