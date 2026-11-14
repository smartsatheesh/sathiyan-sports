import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "./authConfig";
import { connectToMongoose } from "@/app/server/mongodb";
import User from "@/app/models/User";

/**
 * Loads the signed-in user's current role from the database (so a role change takes
 * effect without a fresh login) and checks it against `allow`.
 *
 *   const auth = await requireRole(canManageTournaments);
 *   if (!auth.ok) return auth.response;
 *   auth.role // "admin" | "coach"
 */
export interface RoleCheck {
  ok: boolean;
  role: string;
  userId: string;
  /** The 401/403 to return when `ok` is false */
  response?: NextResponse;
}

export async function requireRole(allow: (role?: string | null) => boolean): Promise<RoleCheck> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { ok: false, role: "", userId: "", response: NextResponse.json({ success: false, error: "Authentication required" }, { status: 401 }) };
  }
  await connectToMongoose();
  const user = session.user.id
    ? await (User.findById as any)(session.user.id).select("role").lean()
    : session.user.email
      ? await (User.findOne as any)({ email: session.user.email }).select("role").lean()
      : null;
  const role: string = user?.role || session.user.role || "customer";
  if (!allow(role)) {
    return { ok: false, role, userId: "", response: NextResponse.json({ success: false, error: "You don't have access to this" }, { status: 403 }) };
  }
  return { ok: true, role, userId: String(user?._id || session.user.id || "") };
}
