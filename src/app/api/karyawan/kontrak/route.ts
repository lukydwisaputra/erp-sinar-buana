import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { errorResponse } from "@/lib/api-error";
import { buildObjectKey, uploadObject } from "@/lib/storage/s3";
import { validateUpload, getExtension } from "@/lib/storage/upload-validation";

/** Admin-only, matching POST/PATCH /api/karyawan's own guard. Surat kontrak
 * is PDF-only (unlike the shared allowlist, which also covers logos/office
 * docs) — checked here on top of `validateUpload`'s size cap. */
export async function POST(request: NextRequest) {
  try {
    requireRole(await getCurrentSession(), "admin");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 400 });
    }
    if (getExtension(file.name) !== ".pdf") {
      return NextResponse.json({ error: "Surat kontrak harus berformat PDF." }, { status: 400 });
    }
    const validationError = validateUpload(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const key = buildObjectKey("kontrak-karyawan", file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadObject(key, buffer, file.type || "application/pdf");

    return NextResponse.json({ url, fileName: file.name });
  } catch (error) {
    return errorResponse(error);
  }
}
