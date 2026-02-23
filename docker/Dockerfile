# ================================
# Stage 1: Install dependencies
# ================================
FROM node:22-alpine AS deps

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install all dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# ================================
# Stage 2: Build the application
# ================================
FROM node:22-alpine AS builder

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source code and config files
COPY package.json pnpm-lock.yaml ./
COPY tsconfig.json tsconfig.build.json nest-cli.json prisma.config.ts ./
COPY src ./src

# Generate Prisma client
RUN pnpm run db:generate

# Build the NestJS application
RUN pnpm run build

# Remove devDependencies to slim down
RUN pnpm prune --prod

# ================================
# Stage 3: Production image
# ================================
FROM node:22-alpine AS production

RUN corepack enable && corepack prepare pnpm@latest --activate

# Add non-root user for security
RUN addgroup --system --gid 1001 nestjs && \
    adduser --system --uid 1001 nestjs

WORKDIR /app

# Copy only what's needed for production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma.config.ts ./
COPY --from=builder /app/src/libs/databases/prisma/schema ./src/libs/databases/prisma/schema
COPY --from=builder /app/src/libs/databases/prisma/migrations ./src/libs/databases/prisma/migrations

# Set ownership
RUN chown -R nestjs:nestjs /app

USER nestjs

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "dist/main"]
