# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---- deps ----
# --ignore-scripts: the project lists several optional MongoDB native
# modules (kerberos, snappy, @mongodb-js/zstd, mongodb-client-encryption)
# that fail to compile with node-gyp in a slim alpine container. The app
# does not use those features - the driver loads them lazily only when
# their respective auth/compression options are enabled - so skipping
# their build scripts keeps the image working and much lighter.
FROM base AS deps
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts --no-audit --no-fund || npm install --ignore-scripts --no-audit --no-fund

# ---- build ----
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# lib/db.ts throws at import when MONGODB_URI is unset, which breaks page
# data collection during the build. A placeholder is enough here: DB reads
# during pre-render are wrapped in try/catch and fall back to empty data.
# At runtime the compose file injects the real URI.
ARG MONGODB_URI=mongodb://mongo:27017/ntdm_animal_hospital
ENV MONGODB_URI=$MONGODB_URI
RUN npm run build

# ---- runner ----
FROM base AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/scripts ./scripts

EXPOSE 3000
CMD ["npm", "start"]
