#!/bin/bash

# ===========================================
# CRYPTALK BACKUP RESTORATION SCRIPT
# ===========================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env.production"
BACKUP_PATH=""
RESTORE_DATE=$(date +%Y%m%d_%H%M%S)
TEMP_DIR="/tmp/cryptalk_restore_$RESTORE_DATE"

# Functions
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✓ $1${NC}"
}

warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠ $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ✗ $1${NC}"
}

# Display usage information
usage() {
    cat << EOF
Usage: $0 [OPTIONS] BACKUP_PATH

Restore CrysTalk application from backup.

ARGUMENTS:
    BACKUP_PATH     Path to backup directory or archive

OPTIONS:
    -h, --help      Show this help message
    -d, --dry-run   Show what would be restored without making changes
    -f, --force     Skip confirmation prompts
    -t, --type      Backup type (full|database|files) [default: full]
    -s, --skip      Skip specific components (postgres|redis|files|config)

EXAMPLES:
    $0 ./backups/20240101_120000
    $0 -t database ./backups/database_backup.sql
    $0 -f --skip redis ./backups/full_backup.tar.gz
    $0 --dry-run ./backups/20240101_120000

BACKUP STRUCTURE:
    backups/
    ├── YYYYMMDD_HHMMSS/
    │   ├── postgres/
    │   │   └── database_dump.sql
    │   ├── redis/
    │   │   └── redis_dump.rdb
    │   ├── files/
    │   │   ├── uploads/
    │   │   └── logs/
    │   └── config/
    │       ├── nginx/
    │       ├── haproxy/
    │       └── env_files/
    └── compressed/
        └── backup_YYYYMMDD_HHMMSS.tar.gz

EOF
}

# Parse command line arguments
parse_args() {
    DRY_RUN=false
    FORCE=false
    BACKUP_TYPE="full"
    SKIP_COMPONENTS=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                usage
                exit 0
                ;;
            -d|--dry-run)
                DRY_RUN=true
                shift
                ;;
            -f|--force)
                FORCE=true
                shift
                ;;
            -t|--type)
                BACKUP_TYPE="$2"
                shift 2
                ;;
            -s|--skip)
                SKIP_COMPONENTS="$2"
                shift 2
                ;;
            -*)
                error "Unknown option: $1"
                usage
                exit 1
                ;;
            *)
                if [[ -z "$BACKUP_PATH" ]]; then
                    BACKUP_PATH="$1"
                else
                    error "Too many arguments"
                    usage
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    if [[ -z "$BACKUP_PATH" ]]; then
        error "Backup path is required"
        usage
        exit 1
    fi
}

# Validate backup path
validate_backup() {
    log "Validating backup path: $BACKUP_PATH"
    
    if [[ ! -e "$BACKUP_PATH" ]]; then
        error "Backup path does not exist: $BACKUP_PATH"
        exit 1
    fi
    
    # Check if it's a compressed file
    if [[ -f "$BACKUP_PATH" ]]; then
        if [[ "$BACKUP_PATH" == *.tar.gz ]]; then
            log "Detected compressed backup file"
            extract_backup
        else
            error "Unsupported backup file format. Expected .tar.gz"
            exit 1
        fi
    elif [[ -d "$BACKUP_PATH" ]]; then
        log "Detected backup directory"
        BACKUP_DIR="$BACKUP_PATH"
    else
        error "Invalid backup path"
        exit 1
    fi
    
    # Validate backup structure
    if [[ ! -d "$BACKUP_DIR" ]]; then
        error "Backup directory not found: $BACKUP_DIR"
        exit 1
    fi
    
    success "Backup validation passed"
}

# Extract compressed backup
extract_backup() {
    log "Extracting compressed backup..."
    
    mkdir -p "$TEMP_DIR"
    
    if ! tar -xzf "$BACKUP_PATH" -C "$TEMP_DIR"; then
        error "Failed to extract backup"
        cleanup
        exit 1
    fi
    
    # Find extracted directory
    BACKUP_DIR=$(find "$TEMP_DIR" -mindepth 1 -maxdepth 1 -type d | head -1)
    
    if [[ -z "$BACKUP_DIR" ]]; then
        error "No directory found in extracted backup"
        cleanup
        exit 1
    fi
    
    success "Backup extracted to: $BACKUP_DIR"
}

# Show backup information
show_backup_info() {
    log "Backup Information:"
    echo "  Path: $BACKUP_PATH"
    echo "  Type: $BACKUP_TYPE"
    echo "  Skip: ${SKIP_COMPONENTS:-none}"
    echo "  Dry Run: $DRY_RUN"
    echo
    
    if [[ -f "$BACKUP_DIR/backup_info.txt" ]]; then
        log "Backup Details:"
        cat "$BACKUP_DIR/backup_info.txt"
        echo
    fi
    
    log "Backup Contents:"
    ls -la "$BACKUP_DIR"
    echo
}

# Confirm restoration
confirm_restore() {
    if [[ "$FORCE" == true ]]; then
        return 0
    fi
    
    warning "This will restore data from backup and may overwrite existing data."
    read -p "Are you sure you want to continue? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Restoration cancelled"
        cleanup
        exit 0
    fi
}

# Stop services
stop_services() {
    log "Stopping services..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would stop services"
        return 0
    fi
    
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
    
    success "Services stopped"
}

# Backup current data
backup_current_data() {
    log "Backing up current data before restoration..."
    
    local current_backup_dir="./backups/pre_restore_$(date +%Y%m%d_%H%M%S)"
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would backup current data to: $current_backup_dir"
        return 0
    fi
    
    mkdir -p "$current_backup_dir"
    
    # Backup current volumes
    if docker volume inspect cryptalk-postgres-data &>/dev/null; then
        docker run --rm -v cryptalk-postgres-data:/data -v "$PWD/$current_backup_dir:/backup" alpine \
            tar -czf /backup/postgres_current.tar.gz -C /data .
    fi
    
    if docker volume inspect cryptalk-redis-data &>/dev/null; then
        docker run --rm -v cryptalk-redis-data:/data -v "$PWD/$current_backup_dir:/backup" alpine \
            tar -czf /backup/redis_current.tar.gz -C /data .
    fi
    
    success "Current data backed up to: $current_backup_dir"
}

# Restore PostgreSQL
restore_postgres() {
    if [[ "$SKIP_COMPONENTS" == *"postgres"* ]]; then
        log "Skipping PostgreSQL restoration"
        return 0
    fi
    
    log "Restoring PostgreSQL..."
    
    local pg_backup="$BACKUP_DIR/postgres/database_dump.sql"
    
    if [[ ! -f "$pg_backup" ]]; then
        warning "PostgreSQL backup not found: $pg_backup"
        return 0
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would restore PostgreSQL from: $pg_backup"
        return 0
    fi
    
    # Start only PostgreSQL
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d postgres
    
    # Wait for PostgreSQL to be ready
    sleep 30
    
    # Drop and recreate database
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
        psql -U "${DB_USER:-cryptalk_user}" -d postgres -c "DROP DATABASE IF EXISTS ${DB_NAME:-cryptalk};"
    
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
        psql -U "${DB_USER:-cryptalk_user}" -d postgres -c "CREATE DATABASE ${DB_NAME:-cryptalk};"
    
    # Restore database
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
        psql -U "${DB_USER:-cryptalk_user}" -d "${DB_NAME:-cryptalk}" < "$pg_backup"
    
    success "PostgreSQL restored successfully"
}

# Restore Redis
restore_redis() {
    if [[ "$SKIP_COMPONENTS" == *"redis"* ]]; then
        log "Skipping Redis restoration"
        return 0
    fi
    
    log "Restoring Redis..."
    
    local redis_backup="$BACKUP_DIR/redis/redis_dump.rdb"
    
    if [[ ! -f "$redis_backup" ]]; then
        warning "Redis backup not found: $redis_backup"
        return 0
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would restore Redis from: $redis_backup"
        return 0
    fi
    
    # Copy Redis dump to volume
    docker volume create cryptalk-redis-data
    docker run --rm -v cryptalk-redis-data:/data -v "$PWD/$BACKUP_DIR/redis:/backup" alpine \
        cp /backup/redis_dump.rdb /data/dump.rdb
    
    success "Redis restored successfully"
}

# Restore files
restore_files() {
    if [[ "$SKIP_COMPONENTS" == *"files"* ]]; then
        log "Skipping files restoration"
        return 0
    fi
    
    log "Restoring files..."
    
    local files_backup="$BACKUP_DIR/files"
    
    if [[ ! -d "$files_backup" ]]; then
        warning "Files backup not found: $files_backup"
        return 0
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would restore files from: $files_backup"
        return 0
    fi
    
    # Restore uploads
    if [[ -d "$files_backup/uploads" ]]; then
        rm -rf ./uploads
        cp -r "$files_backup/uploads" ./
        success "Uploads restored"
    fi
    
    # Restore logs
    if [[ -d "$files_backup/logs" ]]; then
        rm -rf ./logs
        cp -r "$files_backup/logs" ./
        success "Logs restored"
    fi
}

# Restore configuration
restore_config() {
    if [[ "$SKIP_COMPONENTS" == *"config"* ]]; then
        log "Skipping configuration restoration"
        return 0
    fi
    
    log "Restoring configuration..."
    
    local config_backup="$BACKUP_DIR/config"
    
    if [[ ! -d "$config_backup" ]]; then
        warning "Configuration backup not found: $config_backup"
        return 0
    fi
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would restore configuration from: $config_backup"
        return 0
    fi
    
    # Restore nginx config
    if [[ -d "$config_backup/nginx" ]]; then
        cp -r "$config_backup/nginx"/* ./nginx/
        success "Nginx configuration restored"
    fi
    
    # Restore haproxy config
    if [[ -d "$config_backup/haproxy" ]]; then
        cp -r "$config_backup/haproxy"/* ./haproxy/
        success "HAProxy configuration restored"
    fi
    
    # Restore environment files
    if [[ -d "$config_backup/env_files" ]]; then
        cp "$config_backup/env_files/.env" ./
        success "Environment files restored"
    fi
}

# Start services
start_services() {
    log "Starting services..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would start services"
        return 0
    fi
    
    docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d
    
    # Wait for services to be ready
    sleep 60
    
    success "Services started"
}

# Verify restoration
verify_restoration() {
    log "Verifying restoration..."
    
    if [[ "$DRY_RUN" == true ]]; then
        log "[DRY RUN] Would verify restoration"
        return 0
    fi
    
    # Check database connection
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T postgres \
        psql -U "${DB_USER:-cryptalk_user}" -d "${DB_NAME:-cryptalk}" -c "SELECT 1;" &>/dev/null; then
        success "Database connection verified"
    else
        error "Database connection failed"
    fi
    
    # Check Redis connection
    if docker-compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T redis \
        redis-cli ping &>/dev/null; then
        success "Redis connection verified"
    else
        error "Redis connection failed"
    fi
    
    # Check application health
    sleep 30
    if ./scripts/monitor-system.sh check; then
        success "Application health verified"
    else
        warning "Some health checks failed"
    fi
}

# Cleanup temporary files
cleanup() {
    if [[ -d "$TEMP_DIR" ]]; then
        log "Cleaning up temporary files..."
        rm -rf "$TEMP_DIR"
        success "Cleanup completed"
    fi
}

# Main execution
main() {
    log "Starting CrysTalk backup restoration..."
    
    parse_args "$@"
    validate_backup
    show_backup_info
    confirm_restore
    
    # Create restoration point
    backup_current_data
    
    # Stop services
    stop_services
    
    # Perform restoration based on type
    case "$BACKUP_TYPE" in
        "full")
            restore_postgres
            restore_redis
            restore_files
            restore_config
            ;;
        "database")
            restore_postgres
            restore_redis
            ;;
        "files")
            restore_files
            ;;
        "config")
            restore_config
            ;;
        *)
            error "Invalid backup type: $BACKUP_TYPE"
            cleanup
            exit 1
            ;;
    esac
    
    # Start services
    start_services
    
    # Verify restoration
    verify_restoration
    
    # Cleanup
    cleanup
    
    success "Restoration completed successfully!"
    
    if [[ "$DRY_RUN" == false ]]; then
        echo
        log "Next steps:"
        echo "  1. Verify application functionality"
        echo "  2. Check logs for any issues"
        echo "  3. Run health checks"
        echo "  4. Update DNS if needed"
        echo "  5. Notify users of restoration"
    fi
}

# Handle script interruption
trap cleanup INT TERM

# Run main function
main "$@"