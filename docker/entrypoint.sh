#!/bin/sh
set -e

echo "🔄 Running database migrations..."
npx prisma migrate deploy
echo "✅ Migrations complete!"

echo "🚀 Starting application..."
exec node dist/main
