FROM oven/bun:1.3.13-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

FROM base AS runtime
ARG APP_VERSION=dev
ARG GIT_SHA=unknown
ENV NODE_ENV=production
ENV APP_VERSION=${APP_VERSION}
ENV GIT_SHA=${GIT_SHA}
COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
USER bun
EXPOSE 8080
CMD ["bun", "src/index.ts"]
