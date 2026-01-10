#!/bin/bash
# =============================================================================
# VPS Keep-Alive Setup Script
# Configures all layers of the keep-alive system
# =============================================================================

set -e

echo "🔄 VPS Keep-Alive System Setup"
echo "=============================="
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
APP_DIR="${APP_DIR:-/opt/remote-agent}"
WATCHDOG_SCRIPT="$APP_DIR/scripts/vps-watchdog.sh"
CRON_INTERVAL="${CRON_INTERVAL:-5}"  # minutes

# =============================================================================
# Step 1: Install Watchdog Script
# =============================================================================
echo -e "${CYAN}Step 1: Installing watchdog script...${NC}"

if [ -f "$WATCHDOG_SCRIPT" ]; then
  chmod +x "$WATCHDOG_SCRIPT"
  echo -e "${GREEN}Watchdog script ready: $WATCHDOG_SCRIPT${NC}"
else
  echo -e "${RED}Watchdog script not found: $WATCHDOG_SCRIPT${NC}"
  echo -e "${YELLOW}Make sure you're running from the correct directory${NC}"
  exit 1
fi

# =============================================================================
# Step 2: Create Log Directory
# =============================================================================
echo ""
echo -e "${CYAN}Step 2: Setting up logging...${NC}"

touch /var/log/vps-watchdog.log
chmod 644 /var/log/vps-watchdog.log
echo -e "${GREEN}Log file created: /var/log/vps-watchdog.log${NC}"

# =============================================================================
# Step 3: Setup Cron Job
# =============================================================================
echo ""
echo -e "${CYAN}Step 3: Setting up cron job...${NC}"

CRON_LINE="*/$CRON_INTERVAL * * * * root $WATCHDOG_SCRIPT >> /var/log/vps-watchdog.log 2>&1"

# Check if cron job already exists
if grep -q "vps-watchdog.sh" /etc/crontab 2>/dev/null; then
  echo -e "${YELLOW}Cron job already exists, updating...${NC}"
  sed -i '/vps-watchdog.sh/d' /etc/crontab
fi

echo "$CRON_LINE" >> /etc/crontab
echo -e "${GREEN}Cron job installed (every $CRON_INTERVAL minutes)${NC}"

# =============================================================================
# Step 4: Update Systemd Service
# =============================================================================
echo ""
echo -e "${CYAN}Step 4: Updating systemd service with watchdog...${NC}"

SERVICE_FILE="/etc/systemd/system/remote-agent.service"

if [ -f "$SERVICE_FILE" ]; then
  # Backup original
  cp "$SERVICE_FILE" "${SERVICE_FILE}.backup"
  
  # Check if WatchdogSec already exists
  if grep -q "WatchdogSec" "$SERVICE_FILE"; then
    echo -e "${YELLOW}Watchdog already configured in service file${NC}"
  else
    # Add watchdog configuration after [Service] section
    sed -i '/^\[Service\]/a WatchdogSec=120\nWatchdogSignal=SIGABRT' "$SERVICE_FILE"
    echo -e "${GREEN}Watchdog configuration added to service file${NC}"
  fi
  
  # Ensure proper restart policy
  if ! grep -q "Restart=always" "$SERVICE_FILE"; then
    sed -i 's/Restart=.*/Restart=always/' "$SERVICE_FILE"
  fi
  
  # Reload systemd
  systemctl daemon-reload
  echo -e "${GREEN}Systemd configuration reloaded${NC}"
else
  echo -e "${YELLOW}Service file not found: $SERVICE_FILE${NC}"
  echo -e "${YELLOW}Skipping systemd watchdog configuration${NC}"
fi

# =============================================================================
# Step 5: Verify Installation
# =============================================================================
echo ""
echo -e "${CYAN}Step 5: Verifying installation...${NC}"

echo ""
echo "Checking components:"

# Check watchdog script
if [ -x "$WATCHDOG_SCRIPT" ]; then
  echo -e "  ${GREEN}✓${NC} Watchdog script executable"
else
  echo -e "  ${RED}✗${NC} Watchdog script not executable"
fi

# Check cron job
if grep -q "vps-watchdog.sh" /etc/crontab; then
  echo -e "  ${GREEN}✓${NC} Cron job installed"
else
  echo -e "  ${RED}✗${NC} Cron job not found"
fi

# Check systemd service
if systemctl is-enabled remote-agent 2>/dev/null; then
  echo -e "  ${GREEN}✓${NC} Systemd service enabled"
else
  echo -e "  ${YELLOW}!${NC} Systemd service not enabled"
fi

# Check log file
if [ -f "/var/log/vps-watchdog.log" ]; then
  echo -e "  ${GREEN}✓${NC} Log file exists"
else
  echo -e "  ${RED}✗${NC} Log file not created"
fi

# =============================================================================
# Complete!
# =============================================================================
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}✅ VPS Keep-Alive System Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "The keep-alive system has ${CYAN}4 layers${NC} of protection:"
echo ""
echo -e "  ${CYAN}Layer 1:${NC} Application heartbeat (internal)"
echo -e "           - DB ping every 60s"
echo -e "           - Self health check"
echo -e "           - Activity logging"
echo ""
echo -e "  ${CYAN}Layer 2:${NC} Systemd watchdog"
echo -e "           - WatchdogSec=120"
echo -e "           - Auto-restart on timeout"
echo ""
echo -e "  ${CYAN}Layer 3:${NC} External cron watchdog"
echo -e "           - Runs every $CRON_INTERVAL minutes"
echo -e "           - Restarts service if unhealthy"
echo ""
echo -e "  ${CYAN}Layer 4:${NC} Systemd restart policy"
echo -e "           - Restart=always"
echo -e "           - RestartSec=10"
echo ""
echo -e "${YELLOW}To test the system:${NC}"
echo -e "  1. Check logs: tail -f /var/log/vps-watchdog.log"
echo -e "  2. Check app logs: journalctl -u remote-agent -f"
echo -e "  3. Test restart: systemctl restart remote-agent"
echo -e "  4. Check health: curl http://localhost:3000/health/keepalive"
echo ""
echo -e "${YELLOW}Environment variables (optional):${NC}"
echo -e "  KEEP_ALIVE_ENABLED=true       # Enable/disable app heartbeat"
echo -e "  KEEP_ALIVE_INTERVAL=60000     # Heartbeat interval (ms)"
echo -e "  KEEP_ALIVE_EXTERNAL_PING=true # Enable external URL pings"
echo -e "  WATCHDOG_ENABLED=true         # Enable systemd watchdog"
echo ""
