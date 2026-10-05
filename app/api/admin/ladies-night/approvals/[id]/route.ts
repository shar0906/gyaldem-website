// app/api/admin/ladies-night/approvals/[id]/route.ts
//
// POST -> decide on a pending profile submission. Admin-only.
//   { action: "approve" }                         goes live as submitted
//   { action: "approve", edits: { ...profile } }   "Edit, then approve":
//       the full corrected profile; it's validated like an artist's own
//       submission, then goes live
//   { action: "reject", note?: string }            note is shown to the
//       artist in their Profile tab (500 characters max)
//
//   200 { success: true }
//   400 { error: "invalid", field, message } | bad_action
//   404 not_found
//   409 not_pending (already decided or replaced by a newer submission)

import { NextRequest, NextResponse } from "next/server";
import { requireStaffUser, serviceClient } from "../../../../../lib/admin/staff-auth";
import { parseProfile } from "../../../../../lib/ln/profile-rules";
import { artistFolderPublicUrl } from "../../../../../lib/ln/storage";

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const user = await requireStaffUser(["admin"]);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 403 });
  }
  const { id } = await params;

  const body = (await req.json().catch(() => null)) as
    | { action?: unknown; note?: unknown; edits?: unknown }
    | null;
  const action = body?.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "bad_action" }, { status: 400 });
  }

  const db = serviceClient();
  const { data: rev, error: revError } = await db
    .from("ln_artist_profile_revisions")
    .select("id, artist_id, status")
    .eq("id", id)
    .maybeSingle();
  if (revError) {
    console.error("revision lookup failed:", revError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  if (!rev) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (rev.status !== "pending") return NextResponse.json({ error: "not_pending" }, { status: 409 });

  if (action === "reject") {
    const note = typeof body?.note === "string" ? body.note.trim().slice(0, 500) || null : null;
    const { data: updated, error } = await db
      .from("ln_artist_profile_revisions")
      .update({ status: "rejected", reviewed_by: user.email, reviewed_at: new Date().toISOString(), review_note: note })
      .eq("id", id)
      .eq("status", "pending")
      .select("id");
    if (error) {
      console.error("reject failed:", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
    if (!updated?.length) return NextResponse.json({ error: "not_pending" }, { status: 409 });
    return NextResponse.json({ success: true });
  }

  if (body?.edits && typeof body.edits === "object") {
    const parsed = parseProfile(body.edits as Record<string, unknown>, artistFolderPublicUrl(rev.artist_id));
    if (!parsed.ok) {
      return NextResponse.json({ error: "invalid", field: parsed.field, message: parsed.error }, { status: 400 });
    }
    const { error } = await db
      .from("ln_artist_profile_revisions")
      .update(parsed.value)
      .eq("id", id)
      .eq("status", "pending");
    if (error) {
      console.error("approve edits failed:", error);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }

  // Copies the submission onto the live profile in one step.
  const { error: approveError } = await db.rpc("ln_approve_profile_revision", {
    p_revision: id,
    p_reviewer: user.email,
  });
  if (approveError) {
    if (approveError.message?.includes("revision_not_pending")) {
      return NextResponse.json({ error: "not_pending" }, { status: 409 });
    }
    console.error("approve failed:", approveError);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
