#!/bin/bash

# RTGS Sales Automation - PostgreSQL Standalone Starter
# Starts PostgreSQL in Docker without docker-compose

set -e

echo "🐘 Starting PostgreSQL for RTGS Sales Automation..."
echo ""

# Configuration
CONTAINER_NAME="rtgs-postgres"
POSTGRES_VERSION="16-alpine"
POSTGRES_DB="rtgs_sales_automation"
POSTGRES_USER="rtgs_user"
POSTGRES_PASSWORD="rtgs_password_dev"
POSTGRES_PORT="5432"

# Check if container already exists
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
    echo "📦 Container '${CONTAINER_NAME}' already exists"

    # Check if it's running
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
        echo "✅ PostgreSQL is already running!"
        echo ""
        echo "Connection details:"
        echo "  Host: localhost"
        echo "  Port: ${POSTGRES_PORT}"
        echo "  Database: ${POSTGRES_DB}"
        echo "  User: ${POSTGRES_USER}"
        echo "  Password: ${POSTGRES_PASSWORD}"
        exit 0
    else
        echo "▶️  Starting existing container..."
        docker start ${CONTAINER_NAME}
    fi
else
    echo "📦 Creating new PostgreSQL container..."
    docker run -d \
        --name ${CONTAINER_NAME} \
        -e POSTGRES_DB=${POSTGRES_DB} \
        -e POSTGRES_USER=${POSTGRES_USER} \
        -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
        -e PGDATA=/var/lib/postgresql/data/pgdata \
        -v rtgs-postgres-data:/var/lib/postgresql/data \
        -v "$(pwd)/mcp-server/src/db/init:/docker-entrypoint-initdb.d" \
        -p ${POSTGRES_PORT}:5432 \
        --restart unless-stopped \
        postgres:${POSTGRES_VERSION}
fi

echo ""
echo "⏳ Waiting for PostgreSQL to be ready..."

# Wait for PostgreSQL to be healthy
for i in {1..30}; do
    if docker exec ${CONTAINER_NAME} pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB} > /dev/null 2>&1; then
        echo "✅ PostgreSQL is ready!"
        break
    fi

    if [ $i -eq 30 ]; then
        echo "❌ PostgreSQL failed to start within 30 seconds"
        echo "Check logs: docker logs ${CONTAINER_NAME}"
        exit 1
    fi

    echo -n "."
    sleep 1
done

echo ""
echo "🎉 PostgreSQL is running!"
echo ""
echo "Connection details:"
echo "  Host: localhost"
echo "  Port: ${POSTGRES_PORT}"
echo "  Database: ${POSTGRES_DB}"
echo "  User: ${POSTGRES_USER}"
echo "  Password: ${POSTGRES_PASSWORD}"
echo ""
echo "Useful commands:"
echo "  View logs: docker logs ${CONTAINER_NAME}"
echo "  Stop: docker stop ${CONTAINER_NAME}"
echo "  Restart: docker restart ${CONTAINER_NAME}"
echo "  Connect: docker exec -it ${CONTAINER_NAME} psql -U ${POSTGRES_USER} -d ${POSTGRES_DB}"
echo ""
echo "The database schema and sample data have been automatically initialized!"
