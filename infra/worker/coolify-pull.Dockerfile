# Coolify build shim for the Worker — NOT the real build.
#
# The real worker image is built on GitHub Actions (.github/workflows/
# deploy.yml) from infra/worker/Dockerfile and pushed to GHCR. That build
# does `npm ci` + `npx playwright install chromium`, which OOMs this ~4GB
# VPS, so Coolify must not build it here. Coolify is pointed at this file
# (dockerfile_location=/infra/worker/coolify-pull.Dockerfile); "building" it
# just pulls the prebuilt image. CMD comes from the base image.
#
# The VPS docker daemon must be logged in to GHCR: `sudo docker login
# ghcr.io -u <user>` with a PAT (read:packages).
FROM ghcr.io/lukydwisaputra/erp-sinar-buana-worker:testing
