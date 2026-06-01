FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci

COPY apps/frontend apps/frontend
WORKDIR /app/apps/frontend
RUN npm run build

FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5173

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci --omit=dev

COPY --from=builder /app/apps/frontend/dist apps/frontend/dist
COPY --from=builder /app/apps/frontend/server.js apps/frontend/server.js
WORKDIR /app/apps/frontend

CMD ["npm", "run", "start"]
