# VPS Keep-Alive System

Multi-layer protection system to prevent VPS inactivity shutdown.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    VPS KEEP-ALIVE SYSTEM                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  LAYER 1: Application Heartbeat (src/utils/keep-alive.ts)   │
│  ├── Database ping (keeps connections warm)                  │
│  ├── Self health check (validates app responding)            │
│  ├── Activity logging (proves app is alive)                  │
│  └── Optional external URL pings (network activity)          │
│                                                              │
│  LAYER 2: Systemd Watchdog (telegram-agent.service)         │
│  ├── WatchdogSec=120 (2 minute timeout)                     │
│  ├── Auto-restart on watchdog timeout                        │
│  └── WATCHDOG=1 notifications from app                       │
│                                                              │
│  LAYER 3: External Cron Watchdog (scripts/vps-watchdog.sh)  │
│  ├── Runs every 5 minutes via cron                          │
│  ├── Checks /health endpoint                                 │
│  ├── Restarts service if unhealthy                          │
│  └── Independent of main application                         │
│                                                              │
│  LAYER 4: Systemd Restart Policy                            │
│  ├── Restart=always                                          │
│  ├── RestartSec=10                                          │
│  └── StartLimitBurst=5 in 300s                              │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Quick Setup

```bash
# Run the setup script as root
sudo ./scripts/setup-keep-alive.sh

# Restart the service to apply changes
sudo systemctl restart telegram-agent

# Verify it's working
curl http://localhost:3000/health/keepalive
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `KEEP_ALIVE_ENABLED` | `true` | Enable/disable the keep-alive system |
| `KEEP_ALIVE_INTERVAL` | `60000` | Heartbeat interval in milliseconds |
| `WATCHDOG_ENABLED` | `true` | Enable systemd watchdog notifications |
| `KEEP_ALIVE_EXTERNAL_PING` | `false` | Enable external URL pings |
| `KEEP_ALIVE_EXTERNAL_URLS` | `` | Comma-separated URLs to ping |

### Example .env Configuration

```bash
# Aggressive keep-alive (for strict VPS providers)
KEEP_ALIVE_ENABLED=true
KEEP_ALIVE_INTERVAL=30000
WATCHDOG_ENABLED=true
KEEP_ALIVE_EXTERNAL_PING=true
KEEP_ALIVE_EXTERNAL_URLS=https://api.telegram.org,https://www.google.com

# Minimal keep-alive (for lenient VPS providers)
KEEP_ALIVE_ENABLED=true
KEEP_ALIVE_INTERVAL=120000
WATCHDOG_ENABLED=true
KEEP_ALIVE_EXTERNAL_PING=false
```

## Health Endpoints

### GET /health/keepalive

Returns detailed keep-alive system status:

```json
{
  "status": "ok",
  "timestamp": "2025-12-31T12:00:00.000Z",
  "keepAlive": {
    "enabled": true,
    "healthy": true,
    "uptime": {
      "ms": 86400000,
      "formatted": "1d 0h 0m"
    },
    "lastHeartbeat": "2025-12-31T11:59:00.000Z",
    "heartbeatCount": 1440,
    "stats": {
      "dbPings": { "success": 1440, "failures": 0 },
      "selfPings": { "success": 1440, "failures": 0 },
      "externalPings": { "success": 0, "failures": 0 },
      "watchdogNotifications": 1440
    },
    "recentErrors": [],
    "config": {
      "intervalMs": 60000,
      "watchdogEnabled": true,
      "externalPingEnabled": false
    }
  }
}
```

## Monitoring

### View Application Logs

```bash
# Real-time logs
journalctl -u telegram-agent -f

# Last 100 lines
journalctl -u telegram-agent -n 100

# Filter for keep-alive messages
journalctl -u telegram-agent | grep KeepAlive
```

### View Watchdog Logs

```bash
# Real-time watchdog logs
tail -f /var/log/vps-watchdog.log

# Last 50 lines
tail -50 /var/log/vps-watchdog.log
```

### Check Service Status

```bash
# Service status
systemctl status telegram-agent

# Restart count
systemctl show telegram-agent --property=NRestarts
```

## Troubleshooting

### Service Keeps Restarting

1. Check application logs for errors:
   ```bash
   journalctl -u telegram-agent -n 200 --no-pager
   ```

2. Check if database is accessible:
   ```bash
   curl http://localhost:3000/health/db
   ```

3. Verify environment variables:
   ```bash
   cat /opt/creative-ai-coding/.env | grep -v "^#"
   ```

### Watchdog Not Working

1. Verify systemd service has watchdog configured:
   ```bash
   systemctl show telegram-agent | grep Watchdog
   ```

2. Check if WATCHDOG_USEC is set:
   ```bash
   journalctl -u telegram-agent | grep WATCHDOG
   ```

### External Pings Failing

1. Check network connectivity:
   ```bash
   curl -I https://api.telegram.org
   ```

2. Verify firewall allows outbound HTTPS:
   ```bash
   iptables -L OUTPUT -n
   ```

## Manual Testing

### Test Service Restart

```bash
# Stop the service
sudo systemctl stop telegram-agent

# Wait 10 seconds, cron watchdog should restart it
sleep 15

# Check if it's running
systemctl is-active telegram-agent
```

### Test Health Check Failure

```bash
# Block the health endpoint temporarily
sudo iptables -A INPUT -p tcp --dport 3000 -j DROP

# Wait for watchdog to detect and restart
sleep 120

# Remove the block
sudo iptables -D INPUT -p tcp --dport 3000 -j DROP
```

### Test Watchdog Timeout

```bash
# Simulate app freeze (for testing only)
# The watchdog should restart after WatchdogSec (120s)
kill -STOP $(pgrep -f "node.*index.js")
sleep 130
systemctl status telegram-agent
```

## VPS Provider Notes

### Oracle Cloud Free Tier
- Instances may be reclaimed after 7 days of inactivity
- Keep-alive system prevents this by maintaining activity

### AWS Free Tier
- No automatic shutdown, but keep-alive helps with connection pooling

### Google Cloud Free Tier
- Similar to Oracle, may reclaim idle instances
- External pings recommended

### DigitalOcean / Vultr / Linode
- No automatic shutdown for paid instances
- Keep-alive still useful for connection management
