export const SESSION_COOKIE_NAME = "sbmj_session";

export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
export const INVITE_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours (VR-01.7)
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour (VR-01.7)
