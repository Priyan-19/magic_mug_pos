#!/bin/bash
set -e

echo "☕ [Magic Mug] Booting All-in-One POS Container..."

# 1. Start PostgreSQL Service
echo "🐘 [Magic Mug] Initializing PostgreSQL Database..."
service postgresql start

# Wait for PostgreSQL to be ready
until pg_isready -h localhost -p 5432 -U postgres; do
  echo "Waiting for PostgreSQL to start..."
  sleep 1
done

# Setup PostgreSQL Database and User with secure credential fallback
DB_PASS="${POSTGRES_PASSWORD:-$(openssl rand -hex 16 2>/dev/null || echo 'super_secure_pos_password')}"

su - postgres -c "psql -tc \"SELECT 1 FROM pg_database WHERE datname = 'magic_mug_pos'\" | grep -q 1 || psql -c \"CREATE DATABASE magic_mug_pos;\""
su - postgres -c "psql -tc \"SELECT 1 FROM pg_roles WHERE rolname = 'pos_user'\" | grep -q 1 || psql -c \"CREATE USER pos_user WITH ENCRYPTED PASSWORD '${DB_PASS}'; GRANT ALL PRIVILEGES ON DATABASE magic_mug_pos TO pos_user;\""
su - postgres -c "psql -d magic_mug_pos -c \"GRANT ALL ON SCHEMA public TO pos_user; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO pos_user; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO pos_user;\""

# Run Schema init script
if [ -f /docker-entrypoint-initdb.d/init.sql ]; then
  echo "⚙️ [Magic Mug] Applying Database Schema..."
  su - postgres -c "psql -d magic_mug_pos -f /docker-entrypoint-initdb.d/init.sql" || true
fi

# 2. Start FastAPI Backend with per-boot secret generation if omitted
cd /app/backend

APP_SECRET="${SECRET_KEY:-$(openssl rand -hex 32 2>/dev/null || cat /proc/sys/kernel/random/uuid)}"
APP_DB_URL="${DATABASE_URL:-postgresql+asyncpg://pos_user:${DB_PASS}@localhost:5432/magic_mug_pos}"

echo "🚀 [Magic Mug] Starting FastAPI Backend..."
DATABASE_URL="${APP_DB_URL}" \
SECRET_KEY="${APP_SECRET}" \
ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000}" \
uvicorn app.main:app --host 127.0.0.1 --port 8000 &

# 3. Start Nginx in foreground to serve frontend and proxy API
echo "🌐 [Magic Mug] POS Terminal ready at http://localhost:5173!"
nginx -g "daemon off;"
