# ---- Base ----
FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache openssl
RUN npm install -g npm@latest

# ---- Dependencies ----
FROM base AS deps
COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared/package*.json ./packages/shared/
RUN npm ci --workspace=apps/api --workspace=packages/shared

# ---- Development ----
FROM deps AS development
COPY . .
RUN cd apps/api && npx prisma generate
WORKDIR /app/apps/api
EXPOSE 3001
CMD ["npx", "nest", "start", "--watch"]

# ---- Builder ----
FROM deps AS builder
COPY . .
RUN cd apps/api && npx prisma generate
RUN npm run build --workspace=apps/api

# ---- Production ----
FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl
COPY --from=builder /app/apps/api/dist ./dist
COPY --from=builder /app/apps/api/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=builder /app/apps/api/prisma ./prisma
RUN npx prisma generate
EXPOSE 3001
CMD ["node", "dist/main"]
