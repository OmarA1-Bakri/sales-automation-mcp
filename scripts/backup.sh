#!/bin/bash
# =============================================================================
# RTGS Sales Automation - Database Backup Script
# =============================================================================
# Usage: ./backup.sh
# Schedule: Add to crontab for daily backups
#   0 2 * * * /opt/rtgs-sales-automation/scripts/backup.sh >> /var/log/rtgs-backup.log 2>&1
# =============================================================================

set -e

# Configuration
BACKUP_DIR="${BACKUP_DIR:-/opt/backups/rtgs-sales-automation}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE=$(date +%Y%m%d_%H%M%S)
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

log_info "Starting RTGS Sales Automation backup..."

# =============================================================================
# PostgreSQL Database Backup
# =============================================================================
log_info "Backing up PostgreSQL database..."

DB_BACKUP_FILE="$BACKUP_DIR/db-$DATE.sql.gz"

docker-compose -f "$COMPOSE_FILE" exec -T postgres \
    pg_dump -U rtgs_user -d rtgs_sales_automation \
    --no-owner --no-acl \
    | gzip > "$DB_BACKUP_FILE"

if [ -f "$DB_BACKUP_FILE" ]; then
    DB_SIZE=$(du -h "$DB_BACKUP_FILE" | cut -f1)
    log_info "Database backup complete: $DB_BACKUP_FILE ($DB_SIZE)"
else
    log_error "Database backup failed!"
    exit 1
fi

# =============================================================================
# Redis Backup (RDB snapshot)
# =============================================================================
log_info "Creating Redis snapshot..."

REDIS_BACKUP_FILE="$BACKUP_DIR/redis-$DATE.rdb"

# Trigger Redis BGSAVE
docker-compose -f "$COMPOSE_FILE" exec -T redis redis-cli -a "$REDIS_PASSWORD" BGSAVE

# Wait for background save to complete
sleep 5

# Copy RDB file
docker-compose -f "$COMPOSE_FILE" exec -T redis cat /data/dump.rdb > "$REDIS_BACKUP_FILE"

if [ -f "$REDIS_BACKUP_FILE" ]; then
    REDIS_SIZE=$(du -h "$REDIS_BACKUP_FILE" | cut -f1)
    log_info "Redis backup complete: $REDIS_BACKUP_FILE ($REDIS_SIZE)"
else
    log_warn "Redis backup may have failed (file not found)"
fi

# =============================================================================
# Application Data Backup
# =============================================================================
log_info "Backing up application data volume..."

APP_BACKUP_FILE="$BACKUP_DIR/app-data-$DATE.tar.gz"

docker run --rm \
    -v rtgs-sales-data:/data:ro \
    -v "$BACKUP_DIR":/backup \
    alpine tar czf "/backup/app-data-$DATE.tar.gz" -C /data .

if [ -f "$APP_BACKUP_FILE" ]; then
    APP_SIZE=$(du -h "$APP_BACKUP_FILE" | cut -f1)
    log_info "Application data backup complete: $APP_BACKUP_FILE ($APP_SIZE)"
fi

# =============================================================================
# Cleanup Old Backups
# =============================================================================
log_info "Cleaning up backups older than $RETENTION_DAYS days..."

find "$BACKUP_DIR" -name "*.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "*.rdb" -mtime +$RETENTION_DAYS -delete

REMAINING=$(ls -1 "$BACKUP_DIR" | wc -l)
log_info "Cleanup complete. $REMAINING backup files remaining."

# =============================================================================
# Summary
# =============================================================================
log_info "Backup Summary:"
log_info "  Database: $DB_BACKUP_FILE"
log_info "  Redis: $REDIS_BACKUP_FILE"
log_info "  App Data: $APP_BACKUP_FILE"
log_info "Backup completed successfully!"
