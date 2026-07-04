import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "./cookie";
import { getSession, type SessionUser } from "./session";

/** Resolves the caller's session from the request cookie. Real check — not Proxy's optimistic one. */
export async function getCurrentSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!rawToken) return null;
  return getSession(rawToken);
}
