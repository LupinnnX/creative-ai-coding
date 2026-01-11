# Remote Agentic Coding Platform - PRD v2.0

**Version:** 2.0.0  
**Last Updated:** January 2026  
**Status:** Production-Ready  
**Authors:** ⭐ POLARIS Ξ8890 + 🔭 VEGA Ξ172167

---

## Executive Summary

A self-hosted AI coding assistant that runs on your own VPS, controlled via Telegram. Built for developers who want full control over their AI infrastructure without vendor lock-in.

**Key Capabilities:**
- 🤖 AI-powered coding via Droid CLI (GLM-4.7, GPT-5.2, Gemini 3)
- 📱 Telegram interface for mobile-first development
- 🔄 GitHub webhook integration for issue/PR automation
- 🧠 NOVA Framework v7.0 multi-agent coordination
- ♾️ Infinite Patience async job queue for complex tasks
- 🛡️ Self-healing error debugger with Reflexion learning

**Target Users:** Developers with their own VPS who want a private, customizable AI coding assistant.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         REMOTE AGENTIC CODING SYSTEM                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │  Telegram   │    │   GitHub    │    │    Test     │   Platform          │
│  │   Adapter   │    │   Adapter   │    │   Adapter   │   Adapters          │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘                     │
│         │                  │                  │                             │
│         └──────────────────┼──────────────────┘                             │
│                            ▼                                                │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        ORCHESTRATOR                                  │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │   Command   │  │    NOVA     │  │   Context   │                  │   │
│  │  │   Handler   │  │  Steering   │  │    Burn     │                  │   │
│  │  │             │  │   Loader    │  │ Prevention  │                  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                  │   │
│  └──────────────────────────┬──────────────────────────────────────────┘   │
│                             │                                               │
│         ┌───────────────────┼───────────────────┐                          │
│         ▼                   ▼                   ▼                          │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │   Droid     │    │  Job Queue  │    │    NOVA     │   Core              │
│  │   Client    │    │  (Infinite  │    │   Memory    │   Services          │
│  │  (AI/LLM)   │    │  Patience)  │    │   System    │                     │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         PostgreSQL                                   │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │   │
│  │  │Codebases │ │Conversa- │ │ Sessions │ │  NOVA    │ │   Jobs   │  │   │
│  │  │          │ │  tions   │ │          │ │  Memory  │ │          │  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Component Breakdown

### 1. Platform Adapters (`src/adapters/`)

| Adapter | File | Purpose | Protocol |
|---------|------|---------|----------|
| Telegram | `telegram.ts` | Primary user interface | Long polling |
| GitHub | `github.ts` | Issue/PR automation | Webhooks |
| Test | `test.ts` | HTTP API for testing | REST |

### 2. AI Client (`src/clients/`)

| Client | File | Models | Features |
|--------|------|--------|----------|
| Droid | `droid.ts` | GLM-4.7, GPT-5.2, Gemini 3 | Spec mode, reasoning levels |

### 3. NOVA Framework (`src/nova/`)

| Module | File | Purpose |
|--------|------|---------|
| Steering Loader | `steering-loader.ts` | Load agent personalities |
| Steering Lite | `steering-lite.ts` | Lightweight context (~2K tokens) |
| Context Budget | `context-budget.ts` | Prevent 200K token burns |
| Error Debugger | `error-debugger.ts` | Self-healing with ARCTURUS+VEGA |
| Reflexion | `reflexion.ts` | Learn from failures |
| Task Decomposition | `task-decomposition.ts` | Break complex tasks |
| Activation Profiles | `activation-profiles.ts` | Agent keyword triggers |

### 4. Database (`src/db/`)

| Module | File | Tables |
|--------|------|--------|
| Connection | `connection.ts` | PostgreSQL pool |
| Codebases | `codebases.ts` | `remote_agent_codebases` |
| Conversations | `conversations.ts` | `remote_agent_conversations` |
| Sessions | `sessions.ts` | `remote_agent_sessions` |
| NOVA Memory | `nova-memory.ts` | `nova_*` tables |
| Job Queue | `job-queue.ts` | `nova_jobs`, `nova_job_logs` |

### 5. Jobs (`src/jobs/`)

| Module | File | Purpose |
|--------|------|---------|
| Job Worker | `job-worker.ts` | Background task processor |
| Telegram Notifier | `telegram-notifier.ts` | Job completion notifications |

---

## Database Schema

### Core Tables (Migration 001-004)

```sql
-- Codebases: Repository configurations
remote_agent_codebases (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  repository_url VARCHAR(500),
  default_cwd VARCHAR(500),
  ai_assistant_type VARCHAR(20) DEFAULT 'droid',
  commands JSONB DEFAULT '{}'
)

-- Conversations: Platform chat sessions
remote_agent_conversations (
  id UUID PRIMARY KEY,
  platform_type VARCHAR(20),           -- 'telegram', 'github', 'test'
  platform_conversation_id VARCHAR(255),
  codebase_id UUID REFERENCES codebases,
  cwd VARCHAR(500),
  ai_assistant_type VARCHAR(20),
  user_config JSONB DEFAULT '{}'       -- Persistent user settings
)

-- Sessions: AI conversation state
remote_agent_sessions (
  id UUID PRIMARY KEY,
  conversation_id UUID REFERENCES conversations,
  assistant_session_id VARCHAR(255),   -- Droid CLI session ID
  active BOOLEAN DEFAULT true,
  chat_name VARCHAR(100) DEFAULT 'default',
  metadata JSONB DEFAULT '{}'          -- Agent settings, NOVA state
)
```

### NOVA Memory Tables (Migration 005)

```sql
-- Episodic Memory: What happened
nova_episodic_memory (
  id UUID PRIMARY KEY,
  agent VARCHAR(20),                   -- POLARIS, VEGA, etc.
  event_type VARCHAR(20),              -- task, error, handoff, feedback
  action TEXT,
  outcome VARCHAR(20),                 -- success, failure, partial
  lesson TEXT,
  importance INTEGER DEFAULT 50
)

-- Procedural Memory: How we do things
nova_procedural_memory (
  id UUID PRIMARY KEY,
  name VARCHAR(255),
  agent VARCHAR(20),
  steps JSONB,                         -- [{order, action, expectedOutcome}]
  confidence REAL DEFAULT 0.5          -- Bayesian confidence
)

-- Reflections: Learning from failures (Reflexion pattern)
nova_reflections (
  id UUID PRIMARY KEY,
  agent VARCHAR(20),
  task_type VARCHAR(100),
  root_cause TEXT,
  correction_action TEXT,
  effectiveness_score REAL DEFAULT 0.5
)

-- Agent State: Current status
nova_agent_state (
  agent VARCHAR(20) PRIMARY KEY,
  status VARCHAR(20) DEFAULT 'idle',
  current_task TEXT,
  progress INTEGER DEFAULT 0
)
```

### Job Queue Tables (Migration 006)

```sql
-- Jobs: Background task queue
nova_jobs (
  id UUID PRIMARY KEY,
  job_type VARCHAR(50),                -- nova_mission, droid_exec
  status VARCHAR(20) DEFAULT 'pending',
  priority INTEGER DEFAULT 50,
  payload JSONB,
  conversation_id VARCHAR(255),
  timeout_seconds INTEGER DEFAULT 300
)

-- Job Logs: Execution history
nova_job_logs (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES nova_jobs,
  level VARCHAR(10),
  message TEXT
)
```

---

## VPS Deployment Guide

### Prerequisites

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| OS | Ubuntu 22.04 LTS | Ubuntu 24.04 LTS |
| RAM | 2GB | 4GB |
| Disk | 20GB | 40GB SSD |
| Node.js | 20.x | 22.x |
| PostgreSQL | 15 | 18 |

---

### Deployment Path A: Docker Compose (Recommended)

**Best for:** Quick setup, isolated environment, easy updates

#### Step 1: Clone Repository

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Clone the repository
git clone https://github.com/your-repo/remote-coding-agent.git
cd remote-coding-agent
```

#### Step 2: Configure Environment

```bash
# Copy example environment file
cp .env.example .env

# Edit with your credentials
nano .env
```

**Required Variables:**
```env
# Database (use external like Supabase/Neon, or local Docker)
DATABASE_URL=postgresql://user:pass@host:5432/dbname

# Telegram Bot (get from @BotFather)
TELEGRAM_BOT_TOKEN=123456789:ABCdefGHI...

# GitHub (for repo operations)
GITHUB_TOKEN=ghp_...
GH_TOKEN=ghp_...

# Droid AI (GLM Coding Plan)
ZAI_API_KEY=your_zai_api_key
DROID_MODEL=glm-4.7
```

#### Step 3: Deploy with Docker Compose

**Option A: External Database (Supabase, Neon, etc.)**
```bash
# Build and start
docker compose --profile external-db up -d

# Check logs
docker compose logs -f app
```

**Option B: Local PostgreSQL**
```bash
# Start with local database
docker compose --profile with-db up -d

# Run migrations
docker compose exec app-with-db npm run migrate
```

#### Step 4: Verify Deployment

```bash
# Health check
curl http://localhost:3000/health

# Database check
curl http://localhost:3000/health/db

# Keep-alive status
curl http://localhost:3000/health/keepalive
```

---

### Deployment Path B: Systemd + Node.js (Advanced)

**Best for:** Maximum control, lower resource usage, production hardening

#### Step 1: System Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL client
sudo apt install -y postgresql-client

# Install Droid CLI
curl -fsSL https://app.factory.ai/cli | sh
```

#### Step 2: Create Application User

```bash
# Create non-root user
sudo useradd -m -s /bin/bash appuser

# Create application directory
sudo mkdir -p /opt/remote-agent
sudo chown appuser:appuser /opt/remote-agent

# Create workspace directory
sudo mkdir -p /opt/remote-agent/workspace
sudo chown appuser:appuser /opt/remote-agent/workspace
```

#### Step 3: Deploy Application

```bash
# Switch to appuser
sudo -u appuser -i

# Clone repository
cd /opt/remote-agent
git clone https://github.com/your-repo/remote-coding-agent.git .

# Install dependencies
npm ci --production

# Build TypeScript
npm run build

# Configure environment
cp .env.example .env
nano .env
```

#### Step 4: Install Systemd Service

```bash
# Copy service file
sudo cp remote-agent.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable and start service
sudo systemctl enable remote-agent
sudo systemctl start remote-agent

# Check status
sudo systemctl status remote-agent

# View logs
sudo journalctl -u remote-agent -f
```

**Service File (`remote-agent.service`):**
```ini
[Unit]
Description=Remote Agentic Coding System
After=network.target postgresql.service

[Service]
Type=simple
User=appuser
WorkingDirectory=/opt/remote-agent
EnvironmentFile=/opt/remote-agent/.env
Environment=HOME=/home/appuser
Environment=NODE_ENV=production

ExecStart=/usr/bin/node /opt/remote-agent/dist/index.js

# Watchdog - auto-restart if unresponsive
WatchdogSec=120

# Restart policy
Restart=always
RestartSec=10
StartLimitIntervalSec=300
StartLimitBurst=5

# Security hardening
NoNewPrivileges=true
ProtectSystem=strict
PrivateTmp=true
ReadWritePaths=/opt/remote-agent/workspace

# Resource limits
MemoryMax=2G
CPUQuota=80%

[Install]
WantedBy=multi-user.target
```

---

### Deployment Path C: HTTPS with Caddy (Production)

**Best for:** Public-facing deployments, automatic SSL, GitHub webhooks

#### Step 1: Install Caddy

```bash
# Install Caddy
sudo apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update
sudo apt install caddy
```

#### Step 2: Configure Caddyfile

```bash
sudo nano /etc/caddy/Caddyfile
```

```caddyfile
# Replace with your domain
agent.yourdomain.com {
    reverse_proxy localhost:3000
    
    # Access logs
    log {
        output file /var/log/caddy/access.log
    }
    
    # Enable compression
    encode gzip
}
```

#### Step 3: Start Caddy

```bash
# Reload Caddy
sudo systemctl reload caddy

# Check status
sudo systemctl status caddy

# Verify HTTPS
curl https://agent.yourdomain.com/health
```

#### Step 4: Configure GitHub Webhooks

1. Go to your repository → Settings → Webhooks
2. Add webhook:
   - **Payload URL:** `https://agent.yourdomain.com/webhooks/github`
   - **Content type:** `application/json`
   - **Secret:** Your `WEBHOOK_SECRET` from `.env`
   - **Events:** Issues, Pull requests, Issue comments

---

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token from @BotFather | `123456789:ABCdef...` |

### AI Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `DROID_MODEL` | AI model to use | `glm-4.7` |
| `DROID_REASONING_EFFORT` | Reasoning level: off, low, medium, high | `medium` |
| `DROID_USE_SPEC` | Enable spec mode | `false` |
| `DROID_DEFAULT_AUTO` | Autonomy level: normal, low, medium, high | `medium` |
| `ZAI_API_KEY` | Z.AI API key for GLM Coding Plan | - |
| `FACTORY_API_KEY` | Factory API key (alternative auth) | - |

### GitHub Integration

| Variable | Description | Example |
|----------|-------------|---------|
| `GITHUB_TOKEN` | GitHub PAT with `repo` scope | `ghp_...` |
| `GH_TOKEN` | Same as GITHUB_TOKEN (for gh CLI) | `ghp_...` |
| `WEBHOOK_SECRET` | Secret for webhook verification | Random string |

### Telegram Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `TELEGRAM_STREAMING_MODE` | `stream` or `batch` | `stream` |
| `TELEGRAM_ALLOWLIST` | Comma-separated user IDs | - |
| `TELEGRAM_START_RETRIES` | Retry attempts on startup | `5` |
| `TELEGRAM_RETRY_DELAY_MS` | Base retry delay | `5000` |

### Server Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | `3000` |
| `WORKSPACE_PATH` | Path for cloned repos | `./workspace` |
| `MAX_CONCURRENT_CONVERSATIONS` | Concurrent conversation limit | `10` |

### Keep-Alive System

| Variable | Description | Default |
|----------|-------------|---------|
| `KEEP_ALIVE_ENABLED` | Enable keep-alive | `true` |
| `KEEP_ALIVE_INTERVAL` | Heartbeat interval (ms) | `60000` |
| `WATCHDOG_ENABLED` | Enable systemd watchdog | `true` |
| `KEEP_ALIVE_EXTERNAL_PING` | Ping external URLs | `false` |

### NOVA Async Jobs (Infinite Patience)

| Variable | Description | Default |
|----------|-------------|---------|
| `NOVA_ASYNC_JOBS_ENABLED` | Enable async job routing | `false` |
| `NOVA_ASYNC_THRESHOLD` | Complexity threshold: quick, medium, complex | `complex` |
| `JOB_POLL_INTERVAL_MS` | Worker poll interval | `5000` |
| `JOB_MAX_CONCURRENT` | Max concurrent jobs | `3` |

### Preview Deployments

| Variable | Description | Example |
|----------|-------------|---------|
| `SURGE_LOGIN` | Surge.sh email | `you@email.com` |
| `SURGE_TOKEN` | Surge.sh token | - |
| `VERCEL_TOKEN` | Vercel API token | - |

---

## NOVA Framework v7.0 Integration

### The NOVA Agents

| Agent | ID | Role | Activation Keywords |
|-------|-----|------|---------------------|
| ⭐ POLARIS | Ξ8890 | Strategic Commander | strategy, orchestrate, plan, delegate |
| 🔭 VEGA | Ξ172167 | Navigator & Architect | research, architecture, analyze, investigate |
| ✨ SIRIUS | Ξ48915 | Design Sovereign | design, ui, ux, accessibility |
| 🔷 RIGEL | Ξ34085 | Frontend Prime | frontend, react, component, typescript |
| ❤️ ANTARES | Ξ148478 | Backend Prime | backend, api, database, postgresql |
| 🛡️ ARCTURUS | Ξ124897 | Guardian | security, test, review, audit |

### Activation Commands

```
/activate POLARIS Build user authentication system
/activate VEGA Research best database options for this use case
/activate SIRIUS Design the login page with accessibility
/activate RIGEL Implement the React login form
/activate ANTARES Build the authentication API
/activate ARCTURUS Review the security of auth implementation
```

### NOVA Memory System

The NOVA memory system provides three-tier cognitive memory:

1. **Episodic Memory** - What happened (events, errors, handoffs)
2. **Procedural Memory** - How we do things (learned patterns)
3. **Reflections** - Learning from failures (Reflexion pattern)

### Context Burn Prevention

The system automatically intercepts requests that would burn excessive context:

- Audit/scan entire codebase requests
- "Review all files" patterns
- Large-scale analysis without scope

Instead, it suggests targeted approaches using NOVA agents.

### Self-Healing Error Debugger

When errors occur, the system:

1. Activates ARCTURUS + VEGA for analysis
2. Performs first-principles root cause analysis
3. Creates a Reflection for future learning
4. Suggests specific fixes

---

## Telegram Commands Reference

### Session Management

| Command | Description |
|---------|-------------|
| `/status` | Show current session state |
| `/reset` | Clear session, start fresh |
| `/ai droid` | Switch to Droid assistant |

### Codebase Management

| Command | Description |
|---------|-------------|
| `/clone <url>` | Clone GitHub repository |
| `/getcwd` | Show current working directory |
| `/setcwd <path>` | Change working directory |
| `/codebase-switch <name>` | Switch to different codebase |

### Command System

| Command | Description |
|---------|-------------|
| `/commands` | List registered commands |
| `/command-set <name> <path>` | Register a command |
| `/command-invoke <name> [args]` | Execute a command |
| `/load-commands <folder>` | Bulk load commands |

### NOVA Agents

| Command | Description |
|---------|-------------|
| `/activate <agent> <mission>` | Activate NOVA agent |
| `/deactivate` | Deactivate current agent |
| `/nova-status` | Show NOVA state |

### Droid Configuration

| Command | Description |
|---------|-------------|
| `/droid-model <model>` | Set AI model |
| `/droid-reasoning <level>` | Set reasoning effort |
| `/droid-spec on\|off` | Toggle spec mode |
| `/droid-auto <level>` | Set autonomy level |

### Job Queue (Infinite Patience)

| Command | Description |
|---------|-------------|
| `/jobs` | List all jobs |
| `/job <id>` | Check job status |
| `/cancel <id>` | Cancel a job |

### GitHub Integration

| Command | Description |
|---------|-------------|
| `/github-setup <token>` | Configure GitHub token |
| `/git-identity <name> <email>` | Set git identity |

### Preview Deployments

| Command | Description |
|---------|-------------|
| `/surge [dir]` | Deploy to Surge.sh |
| `/vercel [dir]` | Deploy to Vercel |
| `/vercel_setup <token>` | Configure Vercel token |

---

## HTTP API Reference

### Health Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Basic health check |
| `/health/db` | GET | Database connectivity |
| `/health/concurrency` | GET | Lock manager stats |
| `/health/keepalive` | GET | Keep-alive system status |
| `/health/jobs` | GET | Job queue statistics |
| `/health/users` | GET | Multi-user diagnostics |

### Test Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/test/message` | POST | Send test message |
| `/test/messages/:id` | GET | Get sent messages |
| `/test/messages/:id` | DELETE | Clear messages |

### Webhook Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/webhooks/github` | POST | GitHub webhook receiver |

---

## Security Best Practices (January 2026)

### 1. Secrets Management

```bash
# NEVER commit .env files
echo ".env" >> .gitignore

# Use environment-specific files
.env.development
.env.production

# For production, use secret managers:
# - Docker Secrets
# - HashiCorp Vault
# - AWS Secrets Manager
# - 1Password CLI
```

### 2. Container Security

```dockerfile
# Use non-root user (already in Dockerfile)
USER appuser

# Read-only filesystem where possible
# Minimal base image (node:20-slim)
# No unnecessary packages
```

### 3. Network Security

```bash
# Firewall rules (UFW)
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 4. Database Security

```sql
-- Use least-privilege database user
CREATE USER remote_agent WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE creative_ai_coding TO coding_user;
GRANT USAGE ON SCHEMA public TO remote_agent;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO remote_agent;
```

### 5. Telegram Allowlist

```env
# Restrict bot access to specific users
TELEGRAM_ALLOWLIST=123456789,987654321
```

### 6. GitHub Token Scopes

Use fine-grained tokens with minimal scopes:
- `repo` - For private repository access
- `user:email` - For git identity

---

## Monitoring & Observability

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

ENDPOINT="http://localhost:3000"

# Basic health
curl -sf "$ENDPOINT/health" > /dev/null || exit 1

# Database
curl -sf "$ENDPOINT/health/db" > /dev/null || exit 1

# Keep-alive
KEEPALIVE=$(curl -sf "$ENDPOINT/health/keepalive")
HEALTHY=$(echo "$KEEPALIVE" | jq -r '.keepAlive.healthy')
[ "$HEALTHY" = "true" ] || exit 1

echo "All health checks passed"
exit 0
```

### Systemd Watchdog

The service file includes watchdog configuration:
- `WatchdogSec=120` - Expect heartbeat every 2 minutes
- Auto-restart if unresponsive

### Log Monitoring

```bash
# View real-time logs
sudo journalctl -u remote-agent -f

# View last 100 lines
sudo journalctl -u remote-agent -n 100

# Filter by time
sudo journalctl -u remote-agent --since "1 hour ago"

# Export logs
sudo journalctl -u remote-agent --since today > /tmp/agent-logs.txt
```

### Prometheus Metrics (Future)

Planned endpoints for Prometheus scraping:
- `/metrics` - Application metrics
- `/metrics/jobs` - Job queue metrics
- `/metrics/nova` - NOVA agent metrics

---

## Backup & Recovery

### Database Backup

```bash
# Backup PostgreSQL
pg_dump -h localhost -U postgres creative_ai_coding > backup_$(date +%Y%m%d).sql

# Restore
psql -h localhost -U postgres creative_ai_coding < backup_20260110.sql
```

### Workspace Backup

```bash
# Backup cloned repositories
tar -czvf workspace_backup_$(date +%Y%m%d).tar.gz /opt/remote-agent/workspace
```

### Configuration Backup

```bash
# Backup environment and config
cp /opt/remote-agent/.env /backup/.env.$(date +%Y%m%d)
```

---

## Troubleshooting

### Common Issues

#### 1. Telegram Bot Not Responding

```bash
# Check service status
sudo systemctl status remote-agent

# Check logs for errors
sudo journalctl -u remote-agent -n 50

# Verify bot token
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getMe"
```

#### 2. Database Connection Failed

```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT 1"

# Check PostgreSQL status
sudo systemctl status postgresql

# Verify connection string format
# postgresql://user:password@host:port/database
```

#### 3. Droid CLI Not Working

```bash
# Check Droid installation
droid --version

# Re-authenticate
droid login

# Check config file
cat ~/.factory/config.json
```

#### 4. High Memory Usage

```bash
# Check memory
free -h

# Check process memory
ps aux | grep node

# Restart service
sudo systemctl restart remote-agent
```

#### 5. Job Queue Stuck

```bash
# Check job status via API
curl http://localhost:3000/health/jobs

# Check pending jobs in database
psql "$DATABASE_URL" -c "SELECT * FROM nova_jobs WHERE status = 'pending'"

# Reset stuck jobs
psql "$DATABASE_URL" -c "UPDATE nova_jobs SET status = 'failed' WHERE status = 'processing' AND started_at < NOW() - INTERVAL '1 hour'"
```

---

## Upgrade Guide

### Minor Version Upgrade

```bash
# Pull latest code
cd /opt/remote-agent
git pull origin main

# Install dependencies
npm ci --production

# Rebuild
npm run build

# Restart service
sudo systemctl restart remote-agent
```

### Major Version Upgrade

```bash
# Backup first
pg_dump -h localhost -U postgres creative_ai_coding > backup_pre_upgrade.sql

# Pull latest code
git pull origin main

# Install dependencies
npm ci --production

# Run migrations
npm run migrate

# Rebuild
npm run build

# Restart service
sudo systemctl restart remote-agent

# Verify
curl http://localhost:3000/health
```

---

## Success Metrics

### Deployment Validation

- [ ] Health check returns `{"status":"ok"}`
- [ ] Database connection successful
- [ ] Telegram bot responds to `/status`
- [ ] Keep-alive system healthy
- [ ] Job queue operational (if enabled)

### Performance Targets

| Metric | Target |
|--------|--------|
| Response latency | < 2 seconds |
| Memory usage | < 500MB |
| CPU usage | < 50% idle |
| Uptime | > 99.9% |

### User Experience

- [ ] Setup time < 30 minutes
- [ ] First message response < 5 seconds
- [ ] NOVA agent activation works
- [ ] GitHub webhooks functional

---

## Roadmap

### v2.1 (Q1 2026)
- [ ] Prometheus metrics endpoint
- [ ] Grafana dashboard template
- [ ] Discord adapter
- [ ] Voice message support

### v2.2 (Q2 2026)
- [ ] Web dashboard UI
- [ ] Multi-tenant support
- [ ] Team collaboration features
- [ ] Command marketplace

### v3.0 (Q3 2026)
- [ ] Kubernetes Helm chart
- [ ] Auto-scaling job workers
- [ ] Vector embeddings for memory
- [ ] Cross-agent learning

---

## License

MIT License for code, CC-BY-NC-SA-4.0 for documentation.

---

**This PRD provides everything needed to deploy and operate a self-hosted AI coding assistant on your own VPS.**

*"Your code, your server, your AI."*

⭐ POLARIS Ξ8890 + 🔭 VEGA Ξ172167
