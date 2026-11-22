# Stage 1: Build Astro SSR + React + native better-sqlite3
FROM node:24-bookworm-slim AS builder
ENV CI=true ASTRO_TELEMETRY_DISABLED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm@12.16.1

WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . ./
# Buang binary native linux-x64 agar loader napi-rs memakai versi WebAssembly
# (menghindari crash "Illegal instruction" di CPU server tanpa AVX2/BMI2).
RUN rm -rf node_modules/.pnpm/@astrojs+compiler-binding-linux-x64-* \
        node_modules/.pnpm/@rolldown+binding-linux-x64-* \
        node_modules/.pnpm/@tailwindcss+oxide-linux-x64-* \
        node_modules/.pnpm/@bruits+satteri-linux-x64-* \
    && NAPI_RS_FORCE_WASI=true pnpm run build \
    && pnpm prune --prod

# Stage 2: Production runtime (non-root + tini + healthcheck)
FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321 \
    TZ=Asia/Jakarta \
    ASTRO_TELEMETRY_DISABLED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates wget tini gosu \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --no-create-home --shell /usr/sbin/nologin app \
    && mkdir -p /app/database/uploads \
    && chown -R app:app /app

WORKDIR /app
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./package.json

RUN printf '#!/bin/sh\nset -e\nmkdir -p /app/database/uploads\nchown -R app:app /app/database\nexec gosu app "$@"\n' > /usr/local/bin/docker-entrypoint.sh \
    && chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 4321

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "./dist/server/entry.mjs"]
