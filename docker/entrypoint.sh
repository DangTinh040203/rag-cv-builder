#!/bin/sh
set -e

echo "🔄 Running database migrations..."
pnpm exec prisma migrate deploy
echo "✅ Migrations complete!"

echo "🚀 Starting application..."
exec node dist/main
