/**
 * Minimal same-origin JSON fetch wrapper for the real (non-mock) endpoints
 * under src/app/api/**. Browser `fetch` sends cookies automatically for
 * same-origin requests, so no credentials config is needed. `docs/architecture.md`
 * names `ky` as the eventual shared HTTP client — worth adopting once more
 * modules move off mock data; not justified yet for this handful of calls.
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(body?.error ?? "Terjadi kesalahan.", res.status);
  }
  return body as T;
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "POST", body: data ? JSON.stringify(data) : undefined }),
  patch: <T>(path: string, data?: unknown) =>
    request<T>(path, { method: "PATCH", body: data ? JSON.stringify(data) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** Shared by every src/lib/query/*.ts mutation's onError — was reimplemented
 * verbatim in 20 of those files before being pulled in here. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}
