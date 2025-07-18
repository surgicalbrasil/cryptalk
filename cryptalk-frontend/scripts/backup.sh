#!/bin/bash

# CrysTalk Backup Script
# ======================

set -e

# Configuration
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=7

# Database settings
DB_HOST=${DB_HOST:-postgres}
DB_NAME=${DB_NAME:-cryptalk}
DB_USER=${DB_USER:-cryptalk_user}
DB_PASSWORD=${DB_PASSWORD:-secure_password_123}

# Redis settings
REDIS_HOST=${REDIS_HOST:-redis}
REDIS_PORT=${REDIS_PORT:-6379}
REDIS_PASSWORD=${REDIS_PASSWORD:-cryptalk_redis_password_123}

# Logging
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Create backup directory
mkdir -p "$BACKUP_DIR"

# PostgreSQL Backup
log "Starting PostgreSQL backup..."
PGPASSWORD="$DB_PASSWORD" pg_dump \
    -h "$DB_HOST" \
    -U "$DB_USER" \
    -d "$DB_NAME" \
    --format=custom \
    --compress=9 \
    --verbose \
    --file="$BACKUP_DIR/postgres_${DATE}.dump"

if [ $? -eq 0 ]; then
    log "PostgreSQL backup completed successfully"
else
    log "PostgreSQL backup failed"
    exit 1
fi

# Redis Backup
log "Starting Redis backup..."
redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --rdb "$BACKUP_DIR/redis_${DATE}.rdb"

if [ $? -eq 0 ]; then
    log "Redis backup completed successfully"
else
    log "Redis backup failed"
    exit 1
fi

# Elasticsearch Backup (if available)
if curl -s -f "http://elasticsearch:9200/_cluster/health" > /dev/null 2>&1; then
    log "Starting Elasticsearch backup..."
    
    # Create snapshot repository if not exists
    curl -X PUT "http://elasticsearch:9200/_snapshot/backup_repository" \
        -H 'Content-Type: application/json' \
        -d '{
            "type": "fs",
            "settings": {
                "location": "/backups/elasticsearch"
            }
        }'
    
    # Create snapshot
    curl -X PUT "http://elasticsearch:9200/_snapshot/backup_repository/snapshot_${DATE}" \
        -H 'Content-Type: application/json' \
        -d '{
            "indices": "cryptalk-*",
            "ignore_unavailable": true,
            "include_global_state": false
        }'
    
    log "Elasticsearch backup completed successfully"
fi

# Grafana Backup (if available)
if curl -s -f "http://grafana:3000/api/health" > /dev/null 2>&1; then
    log "Starting Grafana backup..."
    
    # Backup dashboards
    curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
        "http://grafana:3000/api/search?type=dash-db" | \
        jq -r '.[] | .uri' | \
        while read -r uri; do
            curl -s -H "Authorization: Bearer $GRAFANA_API_KEY" \
                "http://grafana:3000/api/dashboards/${uri}" > \
                "$BACKUP_DIR/grafana_dashboard_${uri//\//_}_${DATE}.json"
        done
    
    log "Grafana backup completed successfully"
fi

# Create compressed archive
log "Creating compressed archive..."
cd "$BACKUP_DIR"
tar -czf "cryptalk_backup_${DATE}.tar.gz" \
    postgres_${DATE}.dump \
    redis_${DATE}.rdb \
    elasticsearch/ \
    grafana_dashboard_*_${DATE}.json

# Calculate checksum
log "Calculating checksum..."
sha256sum "cryptalk_backup_${DATE}.tar.gz" > "cryptalk_backup_${DATE}.sha256"

# Clean up individual files
rm -f postgres_${DATE}.dump redis_${DATE}.rdb grafana_dashboard_*_${DATE}.json

# Remove old backups
log "Cleaning up old backups..."
find "$BACKUP_DIR" -name "cryptalk_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -name "cryptalk_backup_*.sha256" -mtime +$RETENTION_DAYS -delete

# Upload to remote storage (if configured)
if [ -n "$S3_BUCKET" ]; then
    log "Uploading to S3..."
    aws s3 cp "cryptalk_backup_${DATE}.tar.gz" "s3://$S3_BUCKET/backups/"
    aws s3 cp "cryptalk_backup_${DATE}.sha256" "s3://$S3_BUCKET/backups/"
fi

# Send notification (if configured)
if [ -n "$WEBHOOK_URL" ]; then
    log "Sending notification..."
    curl -X POST "$WEBHOOK_URL" \
        -H 'Content-Type: application/json' \
        -d "{\"text\": \"CrysTalk backup completed successfully at $(date)\"}"
fi

log "Backup process completed successfully"

# Health check
if [ -f "$BACKUP_DIR/cryptalk_backup_${DATE}.tar.gz" ]; then
    log "Backup file created: cryptalk_backup_${DATE}.tar.gz"
    log "Backup size: $(du -h $BACKUP_DIR/cryptalk_backup_${DATE}.tar.gz | cut -f1)"
    exit 0
else
    log "Backup file not found - backup failed"
    exit 1
fi