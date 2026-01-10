#!/bin/bash
# =============================================================================
# Telegram Agent Diagnostic Script
# Run this on your VPS to identify the root cause of Telegram errors
# Usage: sudo bash scripts/diagnose-telegram.sh
# =============================================================================

echo "=============================================="
echo "🔭 VEGA DIAGNOSTIC SCAN - $(date)"
echo "=============================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; }
check_fail() { echo -e "${RED}✗ FAIL${NC}: $1"; }
check_warn() { echo -e "${YELLOW}⚠ WARN${NC}: $1"; }

echo "=== 1. SERVICE STATUS ==="
if systemctl is-active --quiet telegram-agent 2>/dev/null || systemctl is-active --quiet remote-agent 2>/dev/null; then
    check_pass "Service is running"
    SERVICE_NAME=$(systemctl is-active --quiet telegram-agent && echo "telegram-agent" || echo "remote-agent")
else
    check_fail "Service is NOT running"
    echo "  Try: sudo systemctl start telegram-agent (or remote-agent)"
    SERVICE_NAME="telegram-agent"
fi
echo ""

echo "=== 2. RECENT ERRORS (last 50 lines) ==="
echo "Searching for errors in journal..."
sudo journalctl -u $SERVICE_NAME -n 50 --no-pager 2>/dev/null | grep -iE "(error|fail|exception|DIAG)" | tail -20
echo ""

echo "=== 3. NETWORK CONNECTIVITY ==="
# Test Telegram API
if curl -s --connect-timeout 5 https://api.telegram.org > /dev/null 2>&1; then
    check_pass "Telegram API reachable"
else
    check_fail "Cannot reach Telegram API - NETWORK ISSUE"
    echo "  Check: DNS, firewall, IPv6 settings"
fi

# Test Z.AI API
if curl -s --connect-timeout 5 https://api.z.ai > /dev/null 2>&1; then
    check_pass "Z.AI API reachable"
else
    check_fail "Cannot reach Z.AI API - NETWORK ISSUE"
fi

# DNS resolution
if host api.telegram.org > /dev/null 2>&1; then
    check_pass "DNS resolution working"
else
    check_fail "DNS resolution failed"
    echo "  Check /etc/resolv.conf"
fi
echo ""

echo "=== 4. DROID CLI STATUS ==="
DROID_BIN="${DROID_BIN:-/home/appuser/.local/bin/droid}"
if [ -f "$DROID_BIN" ]; then
    check_pass "Droid CLI found at $DROID_BIN"
    
    # Check if executable
    if [ -x "$DROID_BIN" ]; then
        check_pass "Droid CLI is executable"
    else
        check_fail "Droid CLI is not executable"
        echo "  Fix: chmod +x $DROID_BIN"
    fi
else
    check_fail "Droid CLI not found at $DROID_BIN"
    echo "  Install: curl -fsSL https://app.factory.ai/cli | sh"
fi

# Check Factory config
FACTORY_CONFIG="/home/appuser/.factory/config.json"
if [ -f "$FACTORY_CONFIG" ]; then
    check_pass "Factory config exists"
    
    # Check if it has API key
    if grep -q "api_key" "$FACTORY_CONFIG" 2>/dev/null; then
        check_pass "API key configured in config.json"
    else
        check_warn "No api_key found in config.json"
    fi
else
    check_fail "Factory config not found at $FACTORY_CONFIG"
    echo "  Create: See docs/DEPLOY_UBUNTU.md Step 4"
fi
echo ""

echo "=== 5. DATABASE STATUS ==="
if systemctl is-active --quiet postgresql; then
    check_pass "PostgreSQL is running"
else
    check_fail "PostgreSQL is NOT running"
    echo "  Fix: sudo systemctl start postgresql"
fi

# Test connection
if PGPASSWORD="${PGPASSWORD:-postgres}" psql -h localhost -U postgres -c "SELECT 1" > /dev/null 2>&1; then
    check_pass "Database connection OK"
else
    check_warn "Cannot connect to database (may need credentials)"
fi

# Check connections
CONN_COUNT=$(sudo -u postgres psql -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | tr -d ' ')
if [ -n "$CONN_COUNT" ]; then
    if [ "$CONN_COUNT" -gt 8 ]; then
        check_warn "High active connections: $CONN_COUNT"
    else
        check_pass "Active connections: $CONN_COUNT"
    fi
fi
echo ""

echo "=== 6. SYSTEM RESOURCES ==="
# Memory
MEM_AVAIL=$(free -m | awk '/^Mem:/ {print $7}')
MEM_TOTAL=$(free -m | awk '/^Mem:/ {print $2}')
if [ "$MEM_AVAIL" -lt 200 ]; then
    check_fail "Low memory: ${MEM_AVAIL}MB available of ${MEM_TOTAL}MB"
    echo "  Consider: Adding swap or reducing MAX_CONCURRENT_CONVERSATIONS"
else
    check_pass "Memory OK: ${MEM_AVAIL}MB available of ${MEM_TOTAL}MB"
fi

# Disk
DISK_AVAIL=$(df -h / | awk 'NR==2 {print $4}')
DISK_PERCENT=$(df -h / | awk 'NR==2 {print $5}' | tr -d '%')
if [ "$DISK_PERCENT" -gt 90 ]; then
    check_fail "Disk almost full: ${DISK_PERCENT}% used"
else
    check_pass "Disk OK: ${DISK_AVAIL} available (${DISK_PERCENT}% used)"
fi

# Load
LOAD=$(uptime | awk -F'load average:' '{print $2}' | awk '{print $1}' | tr -d ',')
CPU_COUNT=$(nproc)
LOAD_INT=${LOAD%.*}
if [ "$LOAD_INT" -gt "$CPU_COUNT" ]; then
    check_warn "High load: $LOAD (CPUs: $CPU_COUNT)"
else
    check_pass "Load OK: $LOAD (CPUs: $CPU_COUNT)"
fi
echo ""

echo "=== 7. ENVIRONMENT CHECK ==="
# Check .env file
ENV_FILE="/opt/remote-agent/.env"
if [ -f "$ENV_FILE" ]; then
    check_pass ".env file exists"
    
    # Check required vars
    if grep -q "TELEGRAM_BOT_TOKEN" "$ENV_FILE"; then
        check_pass "TELEGRAM_BOT_TOKEN is set"
    else
        check_fail "TELEGRAM_BOT_TOKEN not found in .env"
    fi
    
    if grep -q "DATABASE_URL" "$ENV_FILE"; then
        check_pass "DATABASE_URL is set"
    else
        check_fail "DATABASE_URL not found in .env"
    fi
else
    check_fail ".env file not found at $ENV_FILE"
fi
echo ""

echo "=== 8. HEALTH ENDPOINTS ==="
# Test health endpoint
if curl -s http://localhost:3000/health 2>/dev/null | grep -q "ok"; then
    check_pass "Health endpoint OK"
else
    check_fail "Health endpoint not responding"
fi

# Test DB health
if curl -s http://localhost:3000/health/db 2>/dev/null | grep -q "connected"; then
    check_pass "Database health OK"
else
    check_fail "Database health check failed"
fi

# Test concurrency
CONCURRENCY=$(curl -s http://localhost:3000/health/concurrency 2>/dev/null)
if echo "$CONCURRENCY" | grep -q "active"; then
    ACTIVE=$(echo "$CONCURRENCY" | grep -o '"active":[0-9]*' | cut -d: -f2)
    QUEUED=$(echo "$CONCURRENCY" | grep -o '"queuedTotal":[0-9]*' | cut -d: -f2)
    check_pass "Concurrency: active=$ACTIVE, queued=$QUEUED"
else
    check_warn "Concurrency endpoint not responding"
fi
echo ""

echo "=============================================="
echo "🔭 DIAGNOSTIC SCAN COMPLETE"
echo "=============================================="
echo ""
echo "Next steps:"
echo "1. Review any FAIL items above"
echo "2. Check full logs: sudo journalctl -u $SERVICE_NAME -f"
echo "3. Look for [DIAG] entries after rebuilding with diagnostic logging"
echo ""
