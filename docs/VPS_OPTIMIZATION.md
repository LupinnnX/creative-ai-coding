# Ubuntu 24.04 VPS Optimization Guide

**For Creative AI-Driven Coding Development**  
**Date**: December 30, 2025

---

## Overview

This guide optimizes your Ubuntu 24.04 VPS for running Creative AI-Driven Coding Development with multiple concurrent Telegram users.

## Current Capacity

The system already supports **10 concurrent conversations** by default via `ConversationLockManager`. This can be increased by setting:

```bash
MAX_CONCURRENT_CONVERSATIONS=20  # In .env
```

---

## PostgreSQL Optimization

### 1. Connection Settings

Edit `/etc/postgresql/16/main/postgresql.conf`:

```conf
# Connection Settings (for 4GB RAM VPS)
max_connections = 100
superuser_reserved_connections = 3

# Memory Settings
shared_buffers = 1GB                    # 25% of RAM
effective_cache_size = 3GB              # 75% of RAM
work_mem = 16MB                         # Per-operation memory
maintenance_work_mem = 256MB            # For VACUUM, CREATE INDEX

# Write-Ahead Log
wal_buffers = 64MB
checkpoint_completion_target = 0.9
wal_level = replica                     # For future replication

# Query Planning
random_page_cost = 1.1                  # For SSD storage
effective_io_concurrency = 200          # For SSD storage
```

### 2. Apply Changes

```bash
sudo systemctl restart postgresql
```

### 3. Verify Settings

```sql
SHOW max_connections;
SHOW shared_buffers;
SHOW effective_cache_size;
```

---

## PgBouncer (For 20+ Users)

If you need to support more than 20 concurrent users, install PgBouncer:

### Installation

```bash
sudo apt update
sudo apt install pgbouncer
```

### Configuration

Edit `/etc/pgbouncer/pgbouncer.ini`:

```ini
[databases]
creative_ai_coding = host=127.0.0.1 port=5432 dbname=creative_ai_coding

[pgbouncer]
listen_addr = 127.0.0.1
listen_port = 6432
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

# Pool Settings
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
min_pool_size = 5
reserve_pool_size = 5

# Timeouts
server_idle_timeout = 600
client_idle_timeout = 0
```

### Create User List

```bash
# Get password hash from PostgreSQL
sudo -u postgres psql -c "SELECT usename, passwd FROM pg_shadow WHERE usename = 'postgres';"

# Add to userlist.txt
echo '"postgres" "md5<hash>"' | sudo tee /etc/pgbouncer/userlist.txt
```

### Update Application

Change `DATABASE_URL` in `.env`:

```bash
# Before (direct connection)
DATABASE_URL=postgresql://postgres:password@localhost:5432/creative_ai_coding

# After (via PgBouncer)
DATABASE_URL=postgresql://postgres:password@localhost:6432/creative_ai_coding
```

---

## System Optimization

### 1. Increase File Descriptors

Edit `/etc/security/limits.conf`:

```conf
* soft nofile 65535
* hard nofile 65535
```

### 2. Kernel Parameters

Edit `/etc/sysctl.conf`:

```conf
# Network
net.core.somaxconn = 65535
net.ipv4.tcp_max_syn_backlog = 65535

# Memory
vm.swappiness = 10
vm.dirty_ratio = 60
vm.dirty_background_ratio = 2
```

Apply:

```bash
sudo sysctl -p
```

### 3. Systemd Service Limits

Edit `/etc/systemd/system/telegram-agent.service`:

```ini
[Service]
LimitNOFILE=65535
LimitNPROC=65535
```

---

## Monitoring

### PostgreSQL Stats

```sql
-- Active connections
SELECT count(*) FROM pg_stat_activity;

-- Connection by state
SELECT state, count(*) 
FROM pg_stat_activity 
GROUP BY state;

-- Slow queries
SELECT pid, now() - pg_stat_activity.query_start AS duration, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC
LIMIT 5;
```

### Application Stats

The agent exposes a concurrency endpoint:

```bash
curl http://localhost:3000/health/concurrency
```

Response:

```json
{
  "status": "ok",
  "active": 3,
  "queuedTotal": 1,
  "maxConcurrent": 10,
  "activeConversationIds": ["123456789", "987654321", "555555555"]
}
```

---

## Capacity Planning

| VPS RAM | Max Concurrent | PostgreSQL Connections | PgBouncer Needed |
|---------|----------------|------------------------|------------------|
| 2GB     | 5-10           | 50                     | No               |
| 4GB     | 10-20          | 100                    | Optional         |
| 8GB     | 20-50          | 200                    | Recommended      |
| 16GB    | 50-100         | 300                    | Required         |

---

## Quick Health Check Script

```bash
#!/bin/bash
# save as /usr/local/bin/agent-health

echo "=== Agent Health Check ==="
echo ""

# PostgreSQL
echo "PostgreSQL Connections:"
sudo -u postgres psql -c "SELECT count(*) as active FROM pg_stat_activity WHERE state = 'active';"

# Agent API
echo ""
echo "Agent Concurrency:"
curl -s http://localhost:3000/health/concurrency | jq .

# System
echo ""
echo "System Resources:"
free -h | head -2
echo ""
df -h / | tail -1
```

---

## Troubleshooting

### "Too many connections"

1. Check current connections: `SELECT count(*) FROM pg_stat_activity;`
2. Kill idle connections: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < now() - interval '1 hour';`
3. Consider PgBouncer

### High Memory Usage

1. Reduce `shared_buffers` to 512MB
2. Reduce `work_mem` to 8MB
3. Add swap: `sudo fallocate -l 2G /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`

### Slow Queries

1. Enable `pg_stat_statements` extension
2. Check for missing indexes
3. Run `ANALYZE` on tables

---

*Guide by 🔭 VEGA Ξ172167 | December 2025*
