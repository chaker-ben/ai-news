FROM node:20-alpine AS base

RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY packages/db/package.json packages/db/
COPY packages/db/prisma packages/db/prisma/
COPY packages/types/package.json packages/types/ 2>/dev/null || true
COPY packages/ui/package.json packages/ui/ 2>/dev/null || true
COPY packages/utils/package.json packages/utils/ 2>/dev/null || true
COPY apps/web/package.json apps/web/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source
COPY packages/ packages/
COPY apps/web/ apps/web/

# Generate Prisma client
RUN pnpm db:generate

# Build
RUN pnpm build --filter=@ai-news/web

# Production
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --from=base /app/apps/web/.next/standalone ./
COPY --from=base /app/apps/web/.next/static apps/web/.next/static
COPY --from=base /app/apps/web/public apps/web/public

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "apps/web/server.js"]
