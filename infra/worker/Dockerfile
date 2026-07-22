# Production image for scripts/worker.ts — docs/architecture.md §2's "Worker"
# service (long-running pg-boss consumer: Pengiriman emails + PDF rendering
# + the daily overdue-tax sweep).
#
# Build from the repo root (needs the full src/ tree, not just infra/worker/):
#   docker build -f infra/worker/Dockerfile -t sbmj-erp-worker .
#
# Runs scripts/worker.ts directly via Node's native TS type-stripping (no
# separate compile step — same convention as `npm run worker` in dev and
# every scripts/seed-*.ts), so the Node version here must support it
# (24+; pinned to match the dev machine's 26 for consistency with the app
# image). Chromium is installed explicitly (not via Playwright's own base
# image) to keep that Node version pin exact rather than inheriting
# whatever Node ships in Playwright's upstream image.
ARG NODE_VERSION=26-slim
FROM node:${NODE_VERSION}

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Fixed, user-independent install path — the browser is installed here as
# root (below) but the process runs as the unprivileged `worker` user (see
# USER below); without this, Playwright installs into /root/.cache/ms-playwright
# and the runtime process (a different $HOME) can't find it, failing every
# send with "Executable doesn't exist at /home/worker/.cache/ms-playwright/...".
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package.json package-lock.json ./
RUN npm ci --omit=dev \
  # @playwright/test is a real (non-dev) dependency (see package.json) —
  # `npm ci --omit=dev` keeps it; this installs the actual browser binary
  # + required system libraries (fonts, codecs, etc.) it needs at runtime.
  && npx playwright install --with-deps chromium \
  && chmod -R a+rX /ms-playwright \
  && rm -rf /var/lib/apt/lists/*

# Only what scripts/worker.ts actually imports (relative paths, not the `@/`
# alias — see its own header comment, and crypto.ts's matching one): itself
# plus exactly the src/lib files it reaches into (none of which reach back
# out to anything else under src/lib).
COPY scripts/worker.ts ./scripts/worker.ts
COPY src/lib/crypto.ts ./src/lib/crypto.ts
COPY src/lib/pengiriman/token-fill.ts ./src/lib/pengiriman/token-fill.ts
COPY src/lib/observability ./src/lib/observability

RUN useradd --system --uid 1001 worker
USER worker

CMD ["node", "scripts/worker.ts"]
