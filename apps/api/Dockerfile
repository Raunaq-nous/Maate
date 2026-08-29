# ============================================
# MAATE API — Production Dockerfile
# Multi-stage build for minimal image size
# ============================================

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# ─── Install dependencies ──────────────────
FROM base AS deps
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/tsconfig/package.json ./packages/tsconfig/
RUN pnpm install --frozen-lockfile --prod=false

# ─── Build ──────────────────────────────────
FROM base AS builder
ARG DATABASE_URL="postgresql://postgres:postgres@localhost:5432/maate_placeholder"
ENV DATABASE_URL=${DATABASE_URL}

COPY --from=deps /app ./
COPY . .
RUN pnpm run db:generate
RUN pnpm --filter @maate/api build

# ─── Production image ──────────────────────
FROM node:20-alpine AS runner
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nestjs
WORKDIR /app

COPY --from=builder --chown=nestjs:nodejs /app/apps/api/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/database/src/generated ./node_modules/@maate/database/src/generated

USER nestjs
EXPOSE 3000

ENV NODE_ENV=production
CMD ["node", "dist/main"]
