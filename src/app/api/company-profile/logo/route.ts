import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { errorResponse } from "@/lib/api-error";
import { buildObjectKey, uploadObject } from "@/lib/storage/s3";
import { validateUpload } from "@/lib/storage/upload-validation";

/** Admin-only, matching PATCH /api/company-profile's own guard (same RLS:
 * `company_profile` is admin-write). Proxies the file through the app rather
 * than a presigned client→MinIO PUT — uploads here are small enough that the
 * extra round trip doesn't matter, and it avoids needing CORS configured on
 * the bucket for a one-off upload path. */
export async function POST(request: NextRequest) {
  try {
    requireRole(await getCurrentSession(), "admin");

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Berkas tidak ditemukan." }, { status: 400 });
    }
    const validationError = validateUpload(file);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const key = buildObjectKey("logos", file.name);
    const buffer = Buffer.from(await file.arrayBuffer());
    // file.type is browser-reported and unreliable for Office formats (can be
    // "" on some browser/OS combos) — fall back rather than store an empty
    // Content-Type, which some clients render as a forced download either way.
    const url = await uploadObject(key, buffer, file.type || "application/octet-stream");

    return NextResponse.json({ url });
  } catch (error) {
    return errorResponse(error);
  }
}
