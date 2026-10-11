# Local Docker setup for Nano Beauty (API + Metro). Not a production image.
# Targets:
#   api   - Fastify API, bundled with tsup; migrates DATABASE_URL then serves on :4000
#   metro - Expo/Metro bundler for apps/mobile on :8081 (open on a phone/emulator)

FROM node:22-bookworm-slim AS base
WORKDIR /repo
ENV npm_config_update_notifier=false npm_config_fund=false npm_config_audit=false
# Workspace manifests first so the npm ci layer is cached until dependencies change.
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
COPY packages/contracts/package.json packages/contracts/
COPY packages/design-tokens/package.json packages/design-tokens/

# ---------- API ----------
FROM base AS api-build
RUN npm ci --workspace @nano/api --include-workspace-root
COPY packages packages
COPY apps/api apps/api
RUN npm run build -w @nano/api

FROM node:22-bookworm-slim AS api
WORKDIR /repo
ENV npm_config_update_notifier=false
COPY --from=base /repo/package.json /repo/package-lock.json ./
COPY --from=base /repo/apps/api/package.json apps/api/
COPY --from=base /repo/packages packages
RUN npm ci --workspace @nano/api --omit=dev && npm cache clean --force
COPY --from=api-build /repo/apps/api/dist apps/api/dist
COPY apps/api/migrations apps/api/migrations
WORKDIR /repo/apps/api
EXPOSE 4000
# Forward-only migrations are idempotent; apply them on every start, then serve.
CMD ["sh", "-c", "node dist/migrate-cli.js && exec node dist/server.js"]

# ---------- Metro ----------
FROM base AS metro
RUN npm ci
COPY packages packages
COPY apps/mobile apps/mobile
# Docker-only Metro config + expo-notifications stub for Expo Go (see docker/expo-go/).
COPY docker/expo-go/ apps/mobile/
WORKDIR /repo/apps/mobile
ENV CI=1 EXPO_NO_TELEMETRY=1
EXPOSE 8081
CMD ["sh", "-c", "npx expo start --port 8081 $EXPO_START_FLAGS"]
