import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { updateOption, deleteOption } from "@/lib/daftar-pilihan/service";
import { daftarPilihanKategori, optionExtraSchema } from "@/lib/schemas/daftar-pilihan";
import { errorResponse } from "@/lib/api-error";

const patchBodySchema = z.object({
  nama: z.string().min(1).optional(),
  aktif: z.boolean().optional(),
  extra: optionExtraSchema.optional(),
});

type RouteContext = { params: Promise<{ kategori: string; id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { kategori, id } = await params;
    const parsedKategori = daftarPilihanKategori.parse(kategori);
    const body = patchBodySchema.parse(await request.json());
    const row = await updateOption(session.id, parsedKategori, id, body);
    return NextResponse.json(row);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { kategori, id } = await params;
    const parsedKategori = daftarPilihanKategori.parse(kategori);
    await deleteOption(session.id, parsedKategori, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
