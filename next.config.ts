import type { NextConfig } from "next";

// Applied to every route. Harmless in dev, so not gated on NODE_ENV.
const baseSecurityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

// script-src needs 'unsafe-inline' (no nonce plumbing exists yet) and
// connect-src needs to stay open for the dev HMR websocket — scoped to
// production only so `next dev` isn't at risk of a CSP regression here.
const productionCsp = {
  key: "Content-Security-Policy",
  value: [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; "),
};

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Traces only the files each route actually needs into .next/standalone —
  // the production Docker image copies just that folder, not the full
  // node_modules (see Dockerfile).
  output: "standalone",
  async headers() {
    const headers = process.env.NODE_ENV === "production" ? [...baseSecurityHeaders, productionCsp] : baseSecurityHeaders;
    return [{ source: "/:path*", headers }];
  },
};

export default nextConfig;
