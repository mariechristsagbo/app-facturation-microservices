FROM node:22-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5173

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci

COPY apps/frontend apps/frontend
WORKDIR /app/apps/frontend
RUN npm run build

EXPOSE 5173
CMD ["npm", "run", "start"]
