FROM node:24-bookworm-slim AS build
RUN corepack enable
WORKDIR /src
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build

FROM node:24-bookworm-slim
RUN corepack enable
WORKDIR /app
COPY --from=build /src /app
ENV NODE_ENV=production IDESK_DATA_DIR=/data IDESK_WEB_DIST=/app/apps/web/dist IDESK_PORT=3300
VOLUME /data
EXPOSE 3300
CMD ["sh", "-c", "pnpm --filter api db:migrate && node apps/api/dist/index.js"]
