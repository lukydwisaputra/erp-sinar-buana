import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listOptions, createOption } from "@/lib/daftar-pilihan/service";
import { daftarPilihanKategori, optionExtraSchema } from "@/lib/schemas/daftar-pilihan";
import { errorResponse } from "@/lib/api-error";
import { z } from "zod";

const createBodySchema = z.object({
  nama: z.string().min(1, "Nama wajib diisi."),
  extra: optionExtraSchema.optional(),
});

type RouteContext = { params: Promise<{ kategori: string }> };

// RBAC (planning/prd/02-peran-rbac.md §2.6): Konfigurasi/Daftar Pilihan is
// Admin CRUD only — but the lookups themselves are read by Katalog/Proyek/
// Karyawan forms used by every role, matching db-schema's `read_auth` RLS
// policy (SELECT open to all authenticated, write admin-only).
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const { kategori } = await params;
    const parsedKategori = daftarPilihanKategori.parse(kategori);
    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";
    const rows = await listOptions(session.id, parsedKategori, { includeInactive });
    return NextResponse.json(rows);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin");
    const { kategori } = await params;
    const parsedKategori = daftarPilihanKategori.parse(kategori);
    const body = createBodySchema.parse(await request.json());
    const row = await createOption(session.id, parsedKategori, body.nama, body.extra);
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
