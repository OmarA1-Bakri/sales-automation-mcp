#!/bin/bash
# =============================================================================
# RTGS Sales Automation - Production Deployment Script
# =============================================================================
# Usage: ./deploy.sh [--build] [--migrate] [--restart]
# =============================================================================

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="docker-compose.prod.yml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# Parse arguments
BUILD=false
MIGRATE=false
RESTART=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --build) BUILD=true ;;
        --migrate) MIGRATE=true ;;
        --restart) RESTART=true ;;
        --help)
            echo "Usage: $0 [--build] [--migrate] [--restart]"
            echo "  --build    Rebuild Docker images"
            echo "  --migrate  Run database migrations"
            echo "  --restart  Force restart all services"
            exit 0
            ;;
        *) log_error "Unknown option: $1"; exit 1 ;;
    esac
    shift
done

cd "$PROJECT_DIR"

# =============================================================================
# Pre-flight Checks
# =============================================================================
log_step "Running pre-flight checks..."

# Check for required files
if [ ! -f ".env.production" ]; then
    log_error "Missing .env.production file!"
    log_info "Copy .env.production.template and fill in your credentials."
    exit 1
fi

if [ ! -f "ssl/fullchain.pem" ] || [ ! -f "ssl/privkey.pem" ]; then
    log_error "Missing SSL certificates in ./ssl/"
    log_info "Run: ./scripts/generate-ssl.sh to create self-signed certificates"
    exit 1
fi

# Check Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker is not installed!"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    log_error "Docker Compose is not installed!"
    exit 1
fi

log_info "Pre-flight checks passed!"

# =============================================================================
# Pull Latest Code
# =============================================================================
if git rev-parse --is-inside-work-tree &> /dev/null; then
    log_step "Pulling latest code..."
    git pull origin master || log_warn "Git pull failed, continuing with current code..."
fi

# =============================================================================
# Build Images
# =============================================================================
if [ "$BUILD" = true ]; then
    log_step "Building Docker images..."
    docker-compose -f "$COMPOSE_FILE" build --no-cache
else
    log_step "Building Docker images (cached)..."
    docker-compose -f "$COMPOSE_FILE" build
fi

# =============================================================================
# Start/Restart Services
# =============================================================================
if [ "$RESTART" = true ]; then
    log_step "Stopping all services..."
    docker-compose -f "$COMPOSE_FILE" down
fi

log_step "Starting services..."
docker-compose -f "$COMPOSE_FILE" up -d

# Wait for services to be healthy
log_step "Waiting for services to be healthy..."
sleep 10

# =============================================================================
# Run Migrations (if requested)
# =============================================================================
if [ "$MIGRATE" = true ]; then
    log_step "Running database migrations..."
    docker-compose -f "$COMPOSE_FILE" exec -T rtgs-sales-automation \
        node -e "require('./src/db/connection.js').sequelize.sync()"
fi

# =============================================================================
# Health Check
# =============================================================================
log_step "Running health check..."

MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    HEALTH=$(curl -sf http://localhost:3000/health 2>/dev/null || echo "unhealthy")

    if echo "$HEALTH" | grep -q "healthy"; then
        log_info "API is healthy!"
        break
    fi

    ATTEMPT=$((ATTEMPT + 1))
    log_warn "Waiting for API to be healthy... (attempt $ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
    log_error "API did not become healthy within timeout!"
    docker-compose -f "$COMPOSE_FILE" logs --tail=50 rtgs-sales-automation
    exit 1
fi

# =============================================================================
# Summary
# =============================================================================
echo ""
log_info "=========================================="
log_info "  Deployment Complete!"
log_info "=========================================="
echo ""
docker-compose -f "$COMPOSE_FILE" ps
echo ""
log_info "API URL: https://localhost (or your configured domain)"
log_info "Health Check: curl -k https://localhost/health"
