FROM node:22-alpine AS builder

WORKDIR /app
ENV NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json
RUN --mount=type=cache,target=/root/.npm npm ci

COPY apps/frontend apps/frontend
WORKDIR /app/apps/frontend
RUN npm run build

WORKDIR /app
RUN npm prune --omit=dev

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production \
    PORT=5173 \
    NPM_CONFIG_AUDIT=false \
    NPM_CONFIG_FUND=false \
    NPM_CONFIG_FETCH_RETRIES=5 \
    NPM_CONFIG_FETCH_RETRY_MINTIMEOUT=20000 \
    NPM_CONFIG_FETCH_RETRY_MAXTIMEOUT=120000

COPY --from=builder /app/node_modules node_modules
COPY --from=builder /app/package.json package.json
COPY --from=builder /app/package-lock.json package-lock.json
COPY --from=builder /app/apps/frontend/package.json apps/frontend/package.json

COPY --from=builder /app/apps/frontend/dist apps/frontend/dist
COPY --from=builder /app/apps/frontend/server.js apps/frontend/server.js
COPY --from=builder /app/apps/frontend/auth-headers.js apps/frontend/auth-headers.js
WORKDIR /app/apps/frontend

CMD ["npm", "run", "start"]
