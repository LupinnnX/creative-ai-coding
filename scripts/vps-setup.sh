#!/bin/bash
# =============================================================================
# VPS Setup Script for Creative AI-Driven Coding Development
# Droid CLI + GLM-4.7 (Z.AI Coding Plan) + Telegram + NOVA
# =============================================================================

set -e

echo "🚀 Creative AI-Driven Coding Development - VPS Setup"
echo "============================================"
echo "Droid CLI + GLM-4.7 + NOVA Framework"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root (sudo)${NC}"
  exit 1
fi

# Variables
APP_USER="appuser"
APP_DIR="/opt/remote-agent"
WORKSPACE_DIR="/opt/remote-agent/workspace"

# =============================================================================
# Step 1: System Dependencies
# =============================================================================
echo ""
echo -e "${CYAN}Step 1: Installing system dependencies...${NC}"
apt-get update
apt-get install -y curl git build-essential postgresql postgresql-contrib

# Install Node.js 20
echo ""
echo -e "${CYAN}Step 2: Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

node --version
npm --version

# =============================================================================
# Step 2: Create Application User
# =============================================================================
echo ""
echo -e "${CYAN}Step 3: Creating application user...${NC}"
if ! id "$APP_USER" &>/dev/null; then
  useradd -m -s /bin/bash "$APP_USER"
  echo -e "${GREEN}Created user: $APP_USER${NC}"
else
  echo -e "${GREEN}User $APP_USER already exists${NC}"
fi

# =============================================================================
# Step 3: Install Droid CLI
# =============================================================================
echo ""
echo -e "${CYAN}Step 4: Installing Droid CLI...${NC}"
su - "$APP_USER" -c 'curl -fsSL https://app.factory.ai/cli | sh'
su - "$APP_USER" -c 'echo "export PATH=\"\$HOME/.local/bin:\$PATH\"" >> ~/.bashrc'

if su - "$APP_USER" -c '$HOME/.local/bin/droid --version' &>/dev/null; then
  echo -e "${GREEN}Droid CLI installed successfully${NC}"
else
  echo -e "${YELLOW}Droid CLI may need manual verification${NC}"
fi

# =============================================================================
# Step 4: Create GLM-4.7 Config Template
# =============================================================================
echo ""
echo -e "${CYAN}Step 5: Creating GLM-4.7 config template...${NC}"
su - "$APP_USER" -c 'mkdir -p ~/.factory'

# Create config.json template
su - "$APP_USER" << 'EOFUSER'
cat > ~/.factory/config.json << 'EOF'
{
  "custom_models": [
    {
      "model_display_name": "GLM-4.7 [Z.AI Coding Plan]",
      "model": "glm-4.7",
      "base_url": "https://api.z.ai/api/coding/paas/v4",
      "api_key": "YOUR_ZAI_API_KEY_HERE",
      "provider": "generic-chat-completion-api",
      "max_tokens": 131072
    }
  ]
}
EOF
chmod 600 ~/.factory/config.json
EOFUSER

echo -e "${GREEN}GLM-4.7 config template created${NC}"
echo -e "${RED}⚠️  IMPORTANT: Edit /home/$APP_USER/.factory/config.json with your Z.AI API key!${NC}"

# =============================================================================
# Step 5: Setup Application Directory
# =============================================================================
echo ""
echo -e "${CYAN}Step 6: Setting up application directory...${NC}"
mkdir -p "$APP_DIR"
mkdir -p "$WORKSPACE_DIR"
mkdir -p "$APP_DIR/logs"

# Copy application files
if [ -f "package.json" ]; then
  cp -r . "$APP_DIR/"
  echo -e "${GREEN}Application files copied${NC}"
else
  echo -e "${YELLOW}Run this script from the repository root directory${NC}"
  echo -e "${YELLOW}Or manually copy files to $APP_DIR${NC}"
fi

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# =============================================================================
# Step 6: Install Dependencies and Build
# =============================================================================
echo ""
echo -e "${CYAN}Step 7: Installing npm dependencies...${NC}"
cd "$APP_DIR"
su - "$APP_USER" -c "cd $APP_DIR && npm ci"
su - "$APP_USER" -c "cd $APP_DIR && npm run build"

# =============================================================================
# Step 7: Setup PostgreSQL
# =============================================================================
echo ""
echo -e "${CYAN}Step 8: Setting up PostgreSQL...${NC}"
systemctl enable postgresql
systemctl start postgresql

sudo -u postgres psql -c "CREATE USER codinguser WITH PASSWORD 'changeme';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE creative_ai_coding OWNER codinguser;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE creative_ai_coding TO codinguser;" 2>/dev/null || true

echo -e "${GREEN}PostgreSQL configured${NC}"
echo -e "${YELLOW}⚠️  Change the database password!${NC}"

# Run migrations
if [ -f "$APP_DIR/migrations/001_initial_schema.sql" ]; then
  PGPASSWORD=changeme psql -h localhost -U codinguser -d creative_ai_coding -f "$APP_DIR/migrations/001_initial_schema.sql" 2>/dev/null || true
  echo -e "${GREEN}Migrations applied${NC}"
fi

# =============================================================================
# Step 8: Create Environment File
# =============================================================================
echo ""
echo -e "${CYAN}Step 9: Creating environment file...${NC}"
if [ ! -f "$APP_DIR/.env" ]; then
  cat > "$APP_DIR/.env" << 'EOF'
# =============================================================================
# Creative AI-Driven Coding Development - Production Configuration
# =============================================================================

# Database
DATABASE_URL=postgresql://codinguser:changeme@localhost:5432/creative_ai_coding

# Telegram Bot Token (required)
# Get from: @BotFather on Telegram
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE

# Telegram Allowlist (comma-separated user IDs)
# Get your ID from @userinfobot
TELEGRAM_ALLOWLIST=

# Telegram Streaming Mode
TELEGRAM_STREAMING_MODE=stream

# GitHub Token (for cloning private repos)
GH_TOKEN=ghp_YOUR_TOKEN_HERE
GITHUB_TOKEN=ghp_YOUR_TOKEN_HERE

# Droid Configuration
# GLM-4.7 is configured in ~/.factory/config.json
DROID_MODEL=glm-4.7
DROID_REASONING_EFFORT=medium
DROID_DEFAULT_AUTO=medium
DROID_BIN=/home/appuser/.local/bin/droid

# Server
PORT=3000
WORKSPACE_PATH=/opt/remote-agent/workspace
MAX_CONCURRENT_CONVERSATIONS=10
EOF
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
  echo -e "${GREEN}.env file created${NC}"
else
  echo -e "${GREEN}.env file already exists${NC}"
fi

# =============================================================================
# Step 9: Install systemd Service
# =============================================================================
echo ""
echo -e "${CYAN}Step 10: Installing systemd service...${NC}"
cp "$APP_DIR/remote-agent.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable remote-agent

# =============================================================================
# Step 10: Setup Keep-Alive System
# =============================================================================
echo ""
echo -e "${CYAN}Step 11: Setting up VPS keep-alive system...${NC}"

if [ -f "$APP_DIR/scripts/setup-keep-alive.sh" ]; then
  chmod +x "$APP_DIR/scripts/setup-keep-alive.sh"
  chmod +x "$APP_DIR/scripts/vps-watchdog.sh"
  
  # Run the keep-alive setup
  "$APP_DIR/scripts/setup-keep-alive.sh"
  echo -e "${GREEN}Keep-alive system configured${NC}"
else
  echo -e "${YELLOW}Keep-alive scripts not found, skipping...${NC}"
fi

# =============================================================================
# Complete!
# =============================================================================
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✅ VPS Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "${YELLOW}REQUIRED: Complete these steps before starting:${NC}"
echo ""
echo -e "1. ${CYAN}Configure Z.AI API Key for GLM-4.7:${NC}"
echo -e "   sudo nano /home/$APP_USER/.factory/config.json"
echo -e "   Replace YOUR_ZAI_API_KEY_HERE with your key from:"
echo -e "   ${CYAN}https://z.ai/manage-apikey/apikey-list${NC}"
echo ""
echo -e "2. ${CYAN}Authenticate Droid CLI (TUI login):${NC}"
echo -e "   sudo su - $APP_USER"
echo -e "   droid"
echo -e "   (Complete browser login, then Ctrl+C)"
echo -e "   exit"
echo ""
echo -e "3. ${CYAN}Configure Telegram Bot:${NC}"
echo -e "   sudo nano $APP_DIR/.env"
echo -e "   Set TELEGRAM_BOT_TOKEN and TELEGRAM_ALLOWLIST"
echo ""
echo -e "4. ${CYAN}Change database password:${NC}"
echo -e "   Update password in .env and PostgreSQL"
echo ""
echo -e "5. ${CYAN}Start the service:${NC}"
echo -e "   sudo systemctl start remote-agent"
echo ""
echo -e "6. ${CYAN}Check status:${NC}"
echo -e "   sudo systemctl status remote-agent"
echo -e "   sudo journalctl -u remote-agent -f"
echo ""
echo -e "${GREEN}Droid CLI: /home/$APP_USER/.local/bin/droid${NC}"
echo -e "${GREEN}GLM Config: /home/$APP_USER/.factory/config.json${NC}"
echo ""
