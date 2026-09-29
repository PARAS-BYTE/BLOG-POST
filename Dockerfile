# ==========================================
# Stage 1: Build Frontend (Vite + React)
# ==========================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

# Install dependencies first (leverages Docker layer caching)
COPY frontend/package*.json ./
RUN npm ci

# Copy frontend source code and build production bundle
COPY frontend/ ./
RUN npm run build

# ==========================================
# Stage 2: Production Server (Express + Static SPA)
# ==========================================
FROM node:20-alpine AS runner
WORKDIR /app

# Install backend production dependencies
COPY backend/package*.json ./
RUN npm ci --omit=dev

# Copy backend source code
COPY backend/ ./

# Copy built React frontend to backend/public for static serving
COPY --from=frontend-builder /app/frontend/dist ./public

# Environment configuration
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

# Start Express server
CMD ["node", "server.js"]
