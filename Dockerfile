# IDesk — single image: API + built web, SQLite in /data
FROM node:24-alpine AS build
RUN corepack enable && corepack prepare pnpm@12.9.1 --activate
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/plugin-sdk/package.json packages/plugin-sdk/
COPY plugins/n8n/package.json plugins/n8n/
COPY plugins/dolphinscheduler/package.json plugins/dolphinscheduler/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @idesk/web build

FROM node:24-alpine
RUN corepack enable && corepack prepare pnpm@12.9.1 --activate
WORKDIR /app
COPY --from=build /app /app
ENV NODE_ENV=production \
    IDESK_PORT=7070 \
    IDESK_DATA_DIR=/data \
    IDESK_WEB_DIST=/app/apps/web/dist
VOLUME ["/data"]
EXPOSE 7070
WORKDIR /app/apps/api
CMD ["pnpm", "exec", "tsx", "src/index.ts"]
