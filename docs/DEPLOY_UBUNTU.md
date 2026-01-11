# Deploy to Ubuntu 24.04 VPS with systemctl

Complete deployment guide for Creative AI-Driven Coding Development with Droid CLI + GLM-4.7 + NOVA.

---

## Prerequisites

- Ubuntu 24.04 VPS with root access
- Z.AI API Key from https://z.ai/manage-apikey/apikey-list (for GLM-4.7)
- GLM Coding Plan subscription from https://z.ai/subscribe
- Telegram Bot Token from @BotFather

---

## Step 1: Install System Dependencies

```bash
# SSH to your VPS
ssh root@your-vps-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install build tools
sudo apt install -y git build-essential curl
```

---

## Step 2: Create App User

```bash
# Create dedicated user
sudo useradd -m -s /bin/bash appuser

# Switch to appuser for Droid installation
sudo su - appuser
```

---

## Step 3: Install Droid CLI (as appuser)

```bash
# Install Droid CLI
curl -fsSL https://app.factory.ai/cli | sh

# Add to PATH
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Verify installation
droid --version
```

---

## Step 4: Configure GLM-4.7 (Z.AI Coding Plan)

This is the key step for GLM-4.7 configuration!

```bash
# Still as appuser, create the config directory
mkdir -p ~/.factory

# Create the config.json with your Z.AI API key
cat > ~/.factory/config.json << 'EOF'
{
  "custom_models": [
    {
      "model_display_name": "GLM-4.7 [Z.AI Coding Plan]",
      "model": "glm-4.7",
      "base_url": "https://api.z.ai/api/coding/paas/v4",
      "api_key": "048a9ad7912f4dc59b2d7690d072d642.3YCY70G59Y8rXkqW",
      "provider": "generic-chat-completion-api",
      "max_tokens": 131072
    }
  ]
}
EOF

# IMPORTANT: Replace YOUR_ZAI_API_KEY_HERE with your actual key
nano ~/.factory/config.json

# Secure the file
chmod 600 ~/.factory/config.json
```

### Get Your Z.AI API Key

1. Go to https://z.ai/manage-apikey/apikey-list
2. Create a new API key
3. Subscribe to GLM Coding Plan at https://z.ai/subscribe
4. Use endpoint: `https://api.z.ai/api/coding/paas/v4` (Coding Plan)

---

## Step 5: Authenticate Droid CLI (TUI Login)

```bash
# Still as appuser, run droid once to authenticate
cd ~
droid

# This opens a browser-based login flow
# Complete the Factory.ai authentication
# Press Ctrl+C after login is complete
```

The CLI stores auth tokens in `~/.factory/` automatically. No FACTORY_API_KEY needed!

```bash
# Exit back to root
exit
```

---

## Step 6: Setup Database

```bash
# Start PostgreSQL
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Create database
sudo -u postgres psql << EOF
CREATE USER codinguser WITH PASSWORD 'YOUR_SECURE_DB_PASSWORD';
CREATE DATABASE creative_ai_coding OWNER codinguser;
GRANT ALL PRIVILEGES ON DATABASE creative_ai_coding TO codinguser;
EOF
```

---

## Step 7: Deploy Application

```bash
# Create app directory
sudo mkdir -p /opt/creative-ai-coding/workspace
sudo mkdir -p /opt/creative-ai-coding/logs

# Clone your code
cd /opt/creative-ai-coding
sudo git clone https://github.com/YOUR_USER/creative-ai-coding.git .

# Set ownership
sudo chown -R appuser:appuser /opt/creative-ai-coding

# Install dependencies and build (as appuser)
sudo su - appuser -c 'cd /opt/creative-ai-coding && npm ci'
sudo su - appuser -c 'cd /opt/creative-ai-coding && npm run build'
```

---

## Step 8: Configure Environment

```bash
# Create .env file
sudo nano /opt/creative-ai-coding/.env
```

Add this configuration:

```env
# Database
DATABASE_URL=postgresql://codinguser:YOUR_SECURE_DB_PASSWORD@localhost:5432/creative_ai_coding

# Telegram (required)
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
TELEGRAM_ALLOWLIST=YOUR_TELEGRAM_USER_ID
TELEGRAM_STREAMING_MODE=stream

# GitHub (optional)
GH_TOKEN=ghp_YOUR_TOKEN
GITHUB_TOKEN=ghp_YOUR_TOKEN

# Droid Settings
# GLM-4.7 is configured in ~/.factory/config.json
DROID_MODEL=glm-4.7
DROID_REASONING_EFFORT=medium
DROID_DEFAULT_AUTO=medium
DROID_BIN=/home/appuser/.local/bin/droid

# Server
PORT=3000
WORKSPACE_PATH=/opt/creative-ai-coding/workspace
```

```bash
# Secure the file
sudo chown appuser:appuser /opt/creative-ai-coding/.env
sudo chmod 600 /opt/creative-ai-coding/.env
```

---

## Step 9: Run Migrations

```bash
PGPASSWORD=YOUR_SECURE_DB_PASSWORD psql -h localhost -U codinguser -d creative_ai_coding \
  -f /opt/creative-ai-coding/migrations/001_initial_schema.sql
```

---

## Step 10: Update systemd Service

The service file needs to allow access to appuser's home for Droid config:

```bash
# Edit the service file
sudo nano /opt/creative-ai-coding/telegram-agent.service
```

Update these lines:

```ini
[Service]
# ... existing config ...

# Change ProtectHome to allow reading ~/.factory
ProtectHome=false

# Add HOME environment for Droid CLI
Environment=HOME=/home/appuser
```

```bash
# Copy and enable service
sudo cp /opt/creative-ai-coding/telegram-agent.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable telegram-agent
```

---

## Step 11: Start the Service

```bash
# Start
sudo systemctl start telegram-agent

# Check status
sudo systemctl status telegram-agent

# View logs
sudo journalctl -u telegram-agent -f
```

---

## Verify GLM-4.7 is Working

1. Open Telegram → find your bot
2. Send `/status` - should show "Model: glm-4.7"
3. Send a test message like "Hello, what model are you?"
4. The response should come from GLM-4.7

---

## Management Commands

```bash
# Start/Stop/Restart
sudo systemctl start telegram-agent
sudo systemctl stop telegram-agent
sudo systemctl restart telegram-agent

# Status
sudo systemctl status telegram-agent

# Live logs
sudo journalctl -u telegram-agent -f

# Logs since today
sudo journalctl -u telegram-agent --since today
```

---

## Update Deployment

```bash
cd /opt/creative-ai-coding
sudo -u appuser git pull
sudo -u appuser npm ci
sudo -u appuser npm run build
sudo systemctl restart telegram-agent
```

---

## Troubleshooting

### Droid CLI not found

```bash
# Check the path
sudo su - appuser -c 'which droid'
# Should return: /home/appuser/.local/bin/droid

# Update DROID_BIN in .env if different
```

### GLM-4.7 not working

```bash
# Check config exists
sudo su - appuser -c 'cat ~/.factory/config.json'

# Verify API key is set
# Make sure base_url is: https://api.z.ai/api/coding/paas/v4
```

### Authentication errors

```bash
# Re-authenticate Droid CLI
sudo su - appuser
cd ~
droid
# Complete browser login
exit
sudo systemctl restart telegram-agent
```

### Service can't read Droid config

```bash
# Ensure ProtectHome=false in service file
sudo nano /etc/systemd/system/telegram-agent.service
# Set: ProtectHome=false
# Add: Environment=HOME=/home/appuser
sudo systemctl daemon-reload
sudo systemctl restart telegram-agent
```

---

## File Locations

| Path | Purpose |
|------|---------|
| `/opt/creative-ai-coding/` | Application root |
| `/opt/creative-ai-coding/.env` | App configuration |
| `/home/appuser/.factory/config.json` | GLM-4.7 + Z.AI config |
| `/home/appuser/.factory/` | Droid CLI auth tokens |
| `/opt/creative-ai-coding/workspace/` | Cloned repos |
| `/etc/systemd/system/telegram-agent.service` | Service file |

---

## Quick Test Commands

```bash
# Test Droid CLI directly
sudo su - appuser -c 'cd /opt/creative-ai-coding/workspace && droid exec -o json "Hello, what model are you?"'

# Check service logs for errors
sudo journalctl -u telegram-agent -n 50 --no-pager
```
