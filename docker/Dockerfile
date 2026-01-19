# =============================================================================
# Stage 1: Base - Setup pnpm and dependencies
# =============================================================================
FROM node:22-alpine AS base

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# =============================================================================
# Stage 2: Dependencies - Install all dependencies
# =============================================================================
FROM base AS deps

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies for building)
RUN pnpm install --frozen-lockfile

# =============================================================================
# Stage 3: Builder - Build the application
# =============================================================================
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code and config files
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src

# Build the application
RUN pnpm build

# Prune devDependencies to keep only production deps
RUN pnpm prune --prod

# =============================================================================
# Stage 4: Production - Minimal runtime image
# =============================================================================
FROM node:22-alpine AS production

# Add labels for better image management
LABEL maintainer="rag-cv-builder"
LABEL org.opencontainers.image.title="RAG CV Builder API"
LABEL org.opencontainers.image.description="NestJS API for RAG CV Builder"

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

WORKDIR /app

# Set production environment
ENV NODE_ENV=production
ENV PORT=3000

# Copy only production dependencies
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist

# Copy package.json for runtime
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))" || exit 1

# Start the application
CMD ["node", "dist/main"]
