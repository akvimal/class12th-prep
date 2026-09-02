# Board Prep — single-image build for a small VPS.
# Migrations and the one-time profile setup run as `docker compose run` commands
# (see docker-compose.yml / README), not in the entrypoint.

FROM node:22-bookworm-slim AS base
RUN corepack enable
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/.next ./.next
COPY public ./public
COPY src ./src
COPY drizzle ./drizzle
COPY fixtures ./fixtures
COPY config ./config
COPY scripts ./scripts
COPY package.json pnpm-lock.yaml next.config.mjs drizzle.config.ts tsconfig.json ./

EXPOSE 3000
CMD ["pnpm", "start"]
