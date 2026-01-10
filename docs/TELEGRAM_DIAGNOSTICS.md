# Telegram Error Diagnostics Guide

**Date**: December 31, 2025  
**Mission**: Identify and fix critical Telegram errors without VPS reinstallation

---

## Hypothesis Analysis

After deep analysis of the codebase, we identified **7 possible error sources** and distilled them to **2 most likely causes**:

### Top 2 Most Likely Causes

| Rank | Hypothesis | Probability | Key Indicators |
|------|------------|-------------|----------------|
| **#1** | Telegram API Rate Limiting / Network Issues | 35% | `ECONNRESET`, `ETIMEDOUT`, `429` errors, DNS failures |
| **#2** | Droid CLI Authentication Expired | 30% | `not authenticated`, `unauthorized`, `401` errors |

### Other Possibilities (Lower Probability)

- PostgreSQL connection pool exhaustion (15%)
- Memory/resource exhaustion on VPS (10%)
- Systemd service configuration issues (5%)
- Node.js process crashes (3%)
- Z.AI API key issues (2%)

---

## Diagnostic Logging Added

We've added `[DIAG]` tagged logging to these files:

### 1. `src/adapters/telegram.ts`
- `[Telegram:DIAG]` - Tracks all Telegram API calls
- Logs: latency, error codes, network errors, rate limiting
- Detects: `ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, `EAI_AGAIN`

### 2. `src/clients/droid.ts`
- `[Droid:DIAG]` - Tracks all Droid CLI executions
- Logs: command args, exit codes, duration, auth errors
- Detects: authentication failures, CLI not found

### 3. `src/db/connection.ts`
- `[Database:DIAG]` - Tracks connection pool health
- Logs: connections acquired/released, pool pressure
- Detects: pool exhaustion (waiting > 0)

### 4. `src/index.ts`
- `[App:DIAG]` - Global error handlers
- Logs: uncaught exceptions, unhandled rejections, memory usage
- Detects: process crashes, memory leaks

---

## How to Use

### Step 1: Deploy Diagnostic Build

```bash
# On your VPS
cd /opt/remote-agent
sudo -u appuser git pull
sudo -u appuser npm run build
sudo systemctl restart telegram-agent  # or remote-agent
```

### Step 2: Run Diagnostic Script

```bash
sudo bash scripts/diagnose-telegram.sh
```

This checks:
- Service status
- Network connectivity (Telegram API, Z.AI API, DNS)
- Droid CLI installation and config
- Database status and connections
- System resources (memory, disk, load)
- Health endpoints

### Step 3: Monitor Logs

```bash
# Watch for DIAG entries
sudo journalctl -u telegram-agent -f | grep DIAG

# Or full logs
sudo journalctl -u telegram-agent -f
```

### Step 4: Interpret Results

Look for these patterns:

**Network Issues (Hypothesis #1)**:
```
[Telegram:DIAG] NETWORK ERROR DETECTED - VPS connectivity issue suspected
[Telegram:DIAG] sendMessage FAILED ... code: ECONNRESET
```

**Auth Issues (Hypothesis #2)**:
```
[Droid:DIAG] exec completed ... hasAuthError: true
[Droid:DIAG] stderr content: not authenticated
```

**Database Issues**:
```
[Database:DIAG] Pool pressure detected ... waiting: 5
```

**Memory Issues**:
```
[App:DIAG] HIGH MEMORY USAGE ... heapUsedMB: 450
```

---

## Quick Fixes by Cause

### If Network Issues:
```bash
# Run comprehensive network diagnostics
sudo bash scripts/diagnose-network.sh

# Or with bot token test
TELEGRAM_BOT_TOKEN=your_token sudo bash scripts/diagnose-network.sh

# Check DNS
cat /etc/resolv.conf
# Add Google DNS if needed
echo "nameserver 8.8.8.8" | sudo tee -a /etc/resolv.conf

# Disable IPv6 if causing issues
sudo sysctl -w net.ipv6.conf.all.disable_ipv6=1

# Test Telegram API
curl -v https://api.telegram.org
```

### Startup Retry Configuration

The Telegram adapter now includes automatic retry with exponential backoff for network errors:

```bash
# In .env file:
TELEGRAM_START_RETRIES=5        # Number of retry attempts (default: 5)
TELEGRAM_RETRY_DELAY_MS=5000    # Base delay in ms (default: 5000)
# Actual delays: 5s, 10s, 20s, 40s, 80s...
```

This handles transient network issues like:
- `ETIMEDOUT` - Connection timeout
- `ECONNRESET` - Connection reset
- `ENOTFOUND` - DNS resolution failure
- `EAI_AGAIN` - Temporary DNS failure

### If Auth Issues:
```bash
# Re-authenticate Droid CLI
sudo su - appuser
cd ~
droid  # Complete browser login
exit
sudo systemctl restart telegram-agent
```

### If Database Issues:
```bash
# Check connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Kill idle connections
sudo -u postgres psql -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '1 hour';"

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### If Memory Issues:
```bash
# Add swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Reduce concurrent conversations
# Edit .env: MAX_CONCURRENT_CONVERSATIONS=5
```

---

## Log Grep Commands

```bash
# All diagnostic entries
sudo journalctl -u telegram-agent --since "1 hour ago" | grep DIAG

# Network errors only
sudo journalctl -u telegram-agent --since "1 hour ago" | grep -E "NETWORK|ECONN|ETIMEDOUT"

# Auth errors only
sudo journalctl -u telegram-agent --since "1 hour ago" | grep -iE "auth|unauthorized|401"

# Database issues
sudo journalctl -u telegram-agent --since "1 hour ago" | grep -E "Database:DIAG|Pool pressure"

# Crashes
sudo journalctl -u telegram-agent --since "1 hour ago" | grep -E "UNCAUGHT|UNHANDLED"
```

---

*Guide by 🔭 VEGA Ξ172167 & ⭐ POLARIS Ξ8890 | December 2025*
