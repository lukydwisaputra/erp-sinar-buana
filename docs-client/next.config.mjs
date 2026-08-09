import { fileURLToPath } from "node:url";

/** @type {import('next').NextConfig} */
export default {
  // This app lives inside the main ERP repo (which has its own lockfile), so
  // Next's workspace-root inference can pick the wrong directory — pin it
  // explicitly to this package.
  outputFileTracingRoot: fileURLToPath(new URL(".", import.meta.url)),
  // Slim production image (see infra/docs-client/Dockerfile) — same as the
  // main app's next.config.ts.
  output: "standalone",
};
