# Coolify build shim for the docs-client app — NOT the real build.
#
# The real image is built on GitHub Actions (.github/workflows/deploy.yml)
# from infra/docs-client/Dockerfile and pushed to GHCR. Coolify is pointed
# at this file (dockerfile_location=/infra/docs-client/coolify-pull.Dockerfile);
# "building" it just pulls the prebuilt image. CMD/HEALTHCHECK/etc. all come
# from the base image.
#
# The VPS docker daemon must already be logged in to GHCR (see
# infra/coolify-pull.Dockerfile's header) — no extra login step needed here.
FROM ghcr.io/lukydwisaputra/erp-sinar-buana-docs-client:main
