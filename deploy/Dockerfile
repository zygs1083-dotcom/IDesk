ARG WITH_OFFICE=true
FROM node:24-bookworm-slim AS build
ARG WITH_OFFICE
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/office/package.json apps/office/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/cli/package.json packages/cli/package.json
COPY plugins/n8n/package.json plugins/n8n/package.json
COPY plugins/dolphinscheduler/package.json plugins/dolphinscheduler/package.json
COPY plugins/github-actions/package.json plugins/github-actions/package.json
COPY plugins/webhook-notifier/package.json plugins/webhook-notifier/package.json
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter web build
RUN if [ "$WITH_OFFICE" = "true" ]; then pnpm --filter office build; fi

FROM node:24-bookworm-slim AS runtime
RUN corepack enable
WORKDIR /app
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/apps/api/package.json apps/api/package.json
COPY --from=build /app/packages/shared/package.json packages/shared/package.json
COPY --from=build /app/plugins/n8n/package.json plugins/n8n/package.json
COPY --from=build /app/plugins/dolphinscheduler/package.json plugins/dolphinscheduler/package.json
COPY --from=build /app/plugins/github-actions/package.json plugins/github-actions/package.json
COPY --from=build /app/plugins/webhook-notifier/package.json plugins/webhook-notifier/package.json
RUN pnpm install --frozen-lockfile --prod
COPY apps/api apps/api
COPY packages/shared packages/shared
COPY plugins plugins
COPY --from=build /app/apps/web/dist apps/web/dist
RUN mkdir /data && chown node:node /data
ENV NODE_ENV=production IDESK_DATA_DIR=/data IDESK_WEB_DIST=/app/apps/web/dist IDESK_PORT=3300 IDESK_PLUGIN_DIR=/data/plugins
USER node
VOLUME /data
EXPOSE 3300
WORKDIR /app/apps/api
CMD ["sh", "-c", "./node_modules/.bin/tsx src/db/migrate.ts && exec ./node_modules/.bin/tsx src/index.ts"]

FROM runtime AS runtime-true
COPY --from=build /app/apps/office/dist /app/apps/office/dist
ENV IDESK_OFFICE_DIST=/app/apps/office/dist

FROM runtime AS runtime-false

FROM runtime-${WITH_OFFICE} AS final
