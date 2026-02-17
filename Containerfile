FROM oven/bun:1 AS base
WORKDIR /usr/src/app

FROM base AS deps
COPY package.json bun.lock ./
RUN bun install

FROM base AS builder
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .
ENV NODE_ENV=production
RUN bun run build

FROM base AS runner
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/package.json ./package.json
COPY --from=builder /usr/src/app/next.config.ts ./next.config.ts
COPY --from=builder /usr/src/app/scripts ./scripts
COPY --from=builder /usr/src/app/lib ./lib

USER bun
EXPOSE 3000
ENTRYPOINT [ "bun", "run", "start:prod" ]