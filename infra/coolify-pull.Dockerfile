# Coolify build shim — NOT the real build.
#
# The real image is built on GitHub Actions (.github/workflows/deploy.yml)
# and pushed to GHCR. This box (~4GB RAM) can't run `npm ci`/`next build`
# without OOM, so Coolify must not build the app here. Coolify is pointed at
# this file (dockerfile_location=/infra/coolify-pull.Dockerfile); "building"
# it just pulls the prebuilt image, which is instant. CMD/HEALTHCHECK/etc.
# all come from the base image.
#
# The VPS docker daemon needs to be logged in to GHCR to pull this private
# image: `sudo docker login ghcr.io -u <user>` with a PAT (read:packages).
FROM ghcr.io/lukydwisaputra/erp-sinar-buana:main
