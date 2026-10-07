# =================================================================
# STAGE 1: Build React Frontend Web Application
# =================================================================
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY apps/web/package*.json ./
RUN npm ci

COPY apps/web/ ./
RUN npm run build

# =================================================================
# STAGE 2: Unified Single Container (PostgreSQL + FastAPI + Nginx)
# =================================================================
FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install PostgreSQL, Python 3, Pip, Nginx, Utilities
RUN apt-get update && apt-get install -y --no-install-recommends \
    postgresql \
    postgresql-contrib \
    python3 \
    python3-pip \
    nginx \
    curl \
    ca-certificates \
    dos2unix \
    && rm -rf /var/lib/apt/lists/*

# 1. Setup Frontend in Nginx
WORKDIR /var/www/magicmug
COPY --from=frontend-builder /app/frontend/dist ./
COPY docker/unified-nginx.conf /etc/nginx/sites-available/default

# 2. Setup Backend & Python Dependencies
WORKDIR /app/backend
COPY backend/requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt
COPY backend/ ./

# 3. Setup Database Init SQL and Entrypoint Script
COPY docker/postgres/init.sql /docker-entrypoint-initdb.d/init.sql
COPY docker/entrypoint.sh /app/entrypoint.sh
RUN dos2unix /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# Expose Web Interface (5173) and PostgreSQL (5432)
EXPOSE 5173 5432

ENTRYPOINT ["/bin/bash", "/app/entrypoint.sh"]
