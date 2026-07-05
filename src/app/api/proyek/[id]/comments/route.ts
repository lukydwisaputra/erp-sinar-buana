import { NextRequest, NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth/get-current-session";
import { requireRole } from "@/lib/auth/rbac";
import { listComments, addComment } from "@/lib/proyek/service";
import { addCommentSchema } from "@/lib/schemas/proyek";
import { errorResponse } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(
      await getCurrentSession(),
      "admin", "keuangan", "sales", "tim_teknis", "viewer",
    );
    const { id } = await params;
    const milestoneId = request.nextUrl.searchParams.get("milestoneId");
    if (!milestoneId) return NextResponse.json({ error: "milestoneId wajib diisi." }, { status: 400 });
    const comments = await listComments(session.id, id, milestoneId);
    return NextResponse.json(comments);
  } catch (error) {
    return errorResponse(error);
  }
}

// Matches RLS's comments_ins: any non-viewer role may comment.
export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const session = requireRole(await getCurrentSession(), "admin", "keuangan", "sales", "tim_teknis");
    const { id } = await params;
    const milestoneId = request.nextUrl.searchParams.get("milestoneId");
    if (!milestoneId) return NextResponse.json({ error: "milestoneId wajib diisi." }, { status: 400 });
    const body = addCommentSchema.parse(await request.json());
    const comment = await addComment(session.id, id, milestoneId, body);
    return NextResponse.json(comment, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
