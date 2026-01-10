#!/bin/bash
# Network Diagnostics for Telegram Agent
# Run this on the VPS to diagnose ETIMEDOUT and connectivity issues

set -e

echo "=========================================="
echo "TELEGRAM AGENT NETWORK DIAGNOSTICS"
echo "Date: $(date)"
echo "Hostname: $(hostname)"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
info() { echo -e "[INFO] $1"; }

echo "=== 1. DNS RESOLUTION ==="
echo ""

# Test DNS for api.telegram.org
info "Testing DNS resolution for api.telegram.org..."
if DNS_RESULT=$(dig +short api.telegram.org 2>/dev/null | head -1); then
    if [ -n "$DNS_RESULT" ]; then
        pass "api.telegram.org resolves to: $DNS_RESULT"
    else
        fail "api.telegram.org DNS returned empty result"
    fi
else
    fail "DNS resolution failed for api.telegram.org"
fi

# Test with nslookup as backup
info "Backup DNS test with nslookup..."
if nslookup api.telegram.org >/dev/null 2>&1; then
    pass "nslookup api.telegram.org succeeded"
else
    fail "nslookup api.telegram.org failed"
fi

echo ""
echo "=== 2. TCP CONNECTIVITY ==="
echo ""

# Test TCP connection to Telegram API
info "Testing TCP connection to api.telegram.org:443..."
if timeout 10 bash -c 'cat < /dev/null > /dev/tcp/api.telegram.org/443' 2>/dev/null; then
    pass "TCP connection to api.telegram.org:443 succeeded"
else
    fail "TCP connection to api.telegram.org:443 FAILED (ETIMEDOUT likely)"
fi

# Test with nc (netcat) if available
if command -v nc &> /dev/null; then
    info "Testing with netcat..."
    if nc -z -w 10 api.telegram.org 443 2>/dev/null; then
        pass "netcat test to api.telegram.org:443 succeeded"
    else
        fail "netcat test to api.telegram.org:443 failed"
    fi
fi

echo ""
echo "=== 3. HTTPS CONNECTIVITY ==="
echo ""

# Test HTTPS with curl
info "Testing HTTPS request to api.telegram.org..."
if CURL_RESULT=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 --max-time 15 "https://api.telegram.org/" 2>/dev/null); then
    if [ "$CURL_RESULT" = "200" ] || [ "$CURL_RESULT" = "404" ] || [ "$CURL_RESULT" = "401" ]; then
        pass "HTTPS request succeeded (HTTP $CURL_RESULT)"
    else
        warn "HTTPS request returned unexpected code: $CURL_RESULT"
    fi
else
    fail "HTTPS request to api.telegram.org FAILED"
fi

# Test with verbose output
info "Detailed curl test (showing connection info)..."
curl -v --connect-timeout 10 --max-time 15 "https://api.telegram.org/" 2>&1 | grep -E "(Trying|Connected|SSL|HTTP)" | head -10 || true

echo ""
echo "=== 4. FIREWALL CHECK ==="
echo ""

# Check iptables rules
info "Checking iptables OUTPUT rules..."
if command -v iptables &> /dev/null; then
    BLOCKED=$(iptables -L OUTPUT -n 2>/dev/null | grep -i "DROP\|REJECT" | wc -l)
    if [ "$BLOCKED" -gt 0 ]; then
        warn "Found $BLOCKED DROP/REJECT rules in OUTPUT chain"
        iptables -L OUTPUT -n 2>/dev/null | grep -i "DROP\|REJECT" | head -5
    else
        pass "No blocking rules found in OUTPUT chain"
    fi
else
    info "iptables not available, skipping firewall check"
fi

# Check if port 443 is allowed
info "Checking if outbound port 443 is allowed..."
if iptables -L OUTPUT -n 2>/dev/null | grep -q "443.*ACCEPT"; then
    pass "Port 443 explicitly allowed"
else
    info "Port 443 not explicitly listed (may be allowed by default policy)"
fi

echo ""
echo "=== 5. ROUTE CHECK ==="
echo ""

# Check default route
info "Checking default route..."
if ip route show default 2>/dev/null; then
    pass "Default route exists"
else
    fail "No default route found!"
fi

# Traceroute to Telegram (limited hops)
info "Traceroute to api.telegram.org (first 5 hops)..."
if command -v traceroute &> /dev/null; then
    traceroute -m 5 -w 2 api.telegram.org 2>/dev/null || true
elif command -v tracepath &> /dev/null; then
    tracepath -m 5 api.telegram.org 2>/dev/null || true
else
    info "traceroute/tracepath not available"
fi

echo ""
echo "=== 6. SYSTEM RESOURCES ==="
echo ""

# Check available file descriptors
info "File descriptor limits..."
echo "  Soft limit: $(ulimit -Sn)"
echo "  Hard limit: $(ulimit -Hn)"

# Check open connections
info "Current network connections..."
if command -v ss &> /dev/null; then
    ESTABLISHED=$(ss -t state established 2>/dev/null | wc -l)
    TIME_WAIT=$(ss -t state time-wait 2>/dev/null | wc -l)
    echo "  Established: $ESTABLISHED"
    echo "  Time-wait: $TIME_WAIT"
fi

# Memory check
info "Memory usage..."
free -h 2>/dev/null || true

echo ""
echo "=== 7. TELEGRAM BOT TOKEN TEST ==="
echo ""

# If TELEGRAM_BOT_TOKEN is set, test the getMe endpoint
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
    info "Testing Telegram Bot API with token..."
    MASKED_TOKEN="${TELEGRAM_BOT_TOKEN:0:10}...[REDACTED]"
    info "Using token: $MASKED_TOKEN"
    
    API_RESULT=$(curl -s --connect-timeout 15 --max-time 20 \
        "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe" 2>/dev/null)
    
    if echo "$API_RESULT" | grep -q '"ok":true'; then
        BOT_NAME=$(echo "$API_RESULT" | grep -o '"username":"[^"]*"' | cut -d'"' -f4)
        pass "Bot API test succeeded! Bot username: @$BOT_NAME"
    elif echo "$API_RESULT" | grep -q '"ok":false'; then
        ERROR_DESC=$(echo "$API_RESULT" | grep -o '"description":"[^"]*"' | cut -d'"' -f4)
        fail "Bot API returned error: $ERROR_DESC"
    else
        fail "Bot API test failed (no response or timeout)"
    fi
else
    warn "TELEGRAM_BOT_TOKEN not set, skipping API test"
    info "Run with: TELEGRAM_BOT_TOKEN=your_token ./diagnose-network.sh"
fi

echo ""
echo "=========================================="
echo "DIAGNOSTICS COMPLETE"
echo "=========================================="
echo ""

# Summary
echo "SUMMARY:"
echo "--------"
if timeout 5 bash -c 'cat < /dev/null > /dev/tcp/api.telegram.org/443' 2>/dev/null; then
    pass "Network connectivity to Telegram API: OK"
    echo ""
    echo "If the agent is still failing, check:"
    echo "  1. Bot token validity"
    echo "  2. Application logs for other errors"
    echo "  3. Memory/CPU resources"
else
    fail "Network connectivity to Telegram API: BLOCKED"
    echo ""
    echo "RECOMMENDED ACTIONS:"
    echo "  1. Check if your VPS provider blocks Telegram"
    echo "  2. Try using a proxy: HTTPS_PROXY=http://proxy:port"
    echo "  3. Check firewall rules: iptables -L -n"
    echo "  4. Contact VPS provider support"
    echo "  5. Consider using a VPN or different region"
fi
