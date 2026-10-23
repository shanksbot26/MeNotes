# ==========================================
# Stage 1: Build Frontend Web with Expo
# ==========================================
FROM node:22-alpine AS builder

WORKDIR /app

ENV EXPO_NO_TELEMETRY=1
ENV NODE_ENV=production

# Install client dependencies
COPY package*.json ./
RUN npm ci --legacy-peer-deps

# Copy application source code
COPY . .

# Build the production Expo Web static bundle
RUN npx expo export --platform web

# ==========================================
# Stage 2: Production Self-Hosted Server
# ==========================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/app/data

# Install server production dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --production

# Copy server application code
COPY server/ ./

# Copy compiled frontend web distribution from builder stage
COPY --from=builder /app/dist ./dist

# Create persistent data directory for SQLite
RUN mkdir -p /app/data

EXPOSE 3000

VOLUME ["/app/data"]

CMD ["node", "index.js"]

