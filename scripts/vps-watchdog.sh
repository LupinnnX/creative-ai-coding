#!/bin/bash
# =============================================================================
# VPS Watchdog Script - External Service Monitor
# Runs via cron to ensure the remote-agent service stays alive
# =============================================================================

set -euo pipefail

# Configuration
SERVICE_NAME="remote-agent"
HEALTH_URL="http://127.0.0.1:${PORT:-3000}/health"
LOG_FILE="/var/log/vps-watchdog.log"
MAX_LOG_SIZE=10485760  # 10MB
TIMEOUT=30
MAX_RETRIES=3
RETRY_DELAY=5

# Colors for terminal output (disabled in cron)
if [ -t 1 ]; then
  RED='\033[0;31m'
  GREEN='\033[0;32m'
  YELLOW='\033[1;33m'
  NC='\033[0m'
else
  RED=''
  GREEN=''
  YELLOW=''
  NC=''
fi

# Logging function
log() {
  local level="$1"
  shift
  local message="$*"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] [$level] $message" | tee -a "$LOG_FILE"
}

# Rotate log if too large
rotate_log() {
  if [ -f "$LOG_FILE" ]; then
    local size=$(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE" 2>/dev/null || echo 0)
    if [ "$size" -gt "$MAX_LOG_SIZE" ]; then
      mv "$LOG_FILE" "${LOG_FILE}.old"
      log "INFO" "Log rotated (was ${size} bytes)"
    fi
  fi
}

# Check if service is running via systemd
check_service_status() {
  if systemctl is-active --quiet "$SERVICE_NAME" 2>/dev/null; then
    return 0
  else
    return 1
  fi
}

# Check health endpoint
check_health() {
  local response
  local http_code
  
  # Use curl with timeout
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout "$TIMEOUT" --max-time "$TIMEOUT" "$HEALTH_URL" 2>/dev/null || echo "000")
  
  if [ "$http_code" = "200" ]; then
    return 0
  else
    log "WARN" "Health check returned HTTP $http_code"
    return 1
  fi
}

# Restart the service
restart_service() {
  log "WARN" "Attempting to restart $SERVICE_NAME..."
  
  if systemctl restart "$SERVICE_NAME" 2>/dev/null; then
    log "INFO" "Service restart command sent successfully"
    sleep 10  # Wait for service to start
    
    if check_health; then
      log "INFO" "Service restarted and healthy"
      return 0
    else
      log "ERROR" "Service restarted but health check still failing"
      return 1
    fi
  else
    log "ERROR" "Failed to restart service"
    return 1
  fi
}

# Main watchdog logic
main() {
  rotate_log
  
  log "INFO" "=== VPS Watchdog Check Started ==="
  
  # Step 1: Check if systemd service is running
  if ! check_service_status; then
    log "ERROR" "Service $SERVICE_NAME is not running!"
    restart_service
    exit $?
  fi
  
  log "INFO" "Service $SERVICE_NAME is running"
  
  # Step 2: Check health endpoint with retries
  local retry=0
  local healthy=false
  
  while [ $retry -lt $MAX_RETRIES ]; do
    if check_health; then
      healthy=true
      break
    fi
    
    retry=$((retry + 1))
    if [ $retry -lt $MAX_RETRIES ]; then
      log "WARN" "Health check failed, retry $retry/$MAX_RETRIES in ${RETRY_DELAY}s..."
      sleep $RETRY_DELAY
    fi
  done
  
  if [ "$healthy" = true ]; then
    log "INFO" "Health check passed"
    log "INFO" "=== VPS Watchdog Check Completed (OK) ==="
    exit 0
  else
    log "ERROR" "Health check failed after $MAX_RETRIES retries"
    restart_service
    exit_code=$?
    log "INFO" "=== VPS Watchdog Check Completed (Restart attempted) ==="
    exit $exit_code
  fi
}

# Run main function
main "$@"
