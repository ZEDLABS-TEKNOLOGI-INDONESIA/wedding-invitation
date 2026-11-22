# Stage 1: Build Astro SSR + React + native better-sqlite3
FROM node:22-bookworm-slim AS builder
ENV CI=true ASTRO_TELEMETRY_DISABLED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && npm install -g pnpm@12.16.1

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . ./
RUN pnpm run build \
    && pnpm prune --prod

# Stage 2: Production runtime (non-root + tini + healthcheck)
FROM node:22-bookworm-slim AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321 \
    TZ=Asia/Jakarta \
    ASTRO_TELEMETRY_DISABLED=1

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates wget tini \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --no-create-home --shell /usr/sbin/nologin app \
    && mkdir -p /app/database/uploads \
    && chown -R app:app /app

WORKDIR /app
COPY --from=builder --chown=app:app /app/dist ./dist
COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/package.json ./package.json

EXPOSE 4321
USER app

ENTRYPOINT ["/usr/bin/tini", "--", "node", "./dist/server/entry.mjs"]
