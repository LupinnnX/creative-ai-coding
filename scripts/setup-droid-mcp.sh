#!/bin/bash
# Setup Droid MCP Configuration for VPS
# NOVA Framework v6.0
#
# Usage: ./scripts/setup-droid-mcp.sh
#
# This script copies the MCP configuration to the Droid config directory
# and substitutes environment variables.

set -e

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         NOVA Framework v6.0 - MCP Setup                      ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEMPLATE_FILE="$PROJECT_ROOT/config/droid-mcp.toml"

# Determine Droid config directory
if [ -d "$HOME/.droid" ]; then
    CONFIG_DIR="$HOME/.droid"
elif [ -d "$HOME/.codex" ]; then
    CONFIG_DIR="$HOME/.codex"
else
    CONFIG_DIR="$HOME/.droid"
    mkdir -p "$CONFIG_DIR"
    echo "✅ Created config directory: $CONFIG_DIR"
fi

CONFIG_FILE="$CONFIG_DIR/config.toml"

echo "📁 Template: $TEMPLATE_FILE"
echo "📁 Target:   $CONFIG_FILE"
echo ""

# Check if template exists
if [ ! -f "$TEMPLATE_FILE" ]; then
    echo "❌ Template file not found: $TEMPLATE_FILE"
    exit 1
fi

# ============================================================================
# API KEY SETUP
# ============================================================================
echo "═══════════════════════════════════════════════════════════════"
echo "                    API KEY CONFIGURATION                       "
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Check BRAVE_API_KEY
if [ -z "$BRAVE_API_KEY" ]; then
    echo "⚠️  BRAVE_API_KEY not set"
    echo ""
    echo "   To get a free Brave Search API key:"
    echo "   1. Go to: https://brave.com/search/api/"
    echo "   2. Click 'Get Started for Free'"
    echo "   3. Create account and get your API key"
    echo "   4. Run: export BRAVE_API_KEY=\"your-key-here\""
    echo ""
    read -p "   Enter BRAVE_API_KEY now (or press Enter to skip): " BRAVE_INPUT
    if [ -n "$BRAVE_INPUT" ]; then
        export BRAVE_API_KEY="$BRAVE_INPUT"
        echo "   ✅ BRAVE_API_KEY set for this session"
        echo ""
        echo "   💡 To make permanent, add to ~/.bashrc or .env:"
        echo "      echo 'export BRAVE_API_KEY=\"$BRAVE_API_KEY\"' >> ~/.bashrc"
    else
        echo "   ⏭️  Skipping - brave-search will not work"
    fi
else
    echo "✅ BRAVE_API_KEY is set"
fi
echo ""

# Check GITHUB_TOKEN (optional)
if [ -z "$GITHUB_TOKEN" ]; then
    echo "ℹ️  GITHUB_TOKEN not set (optional - for GitHub MCP server)"
else
    echo "✅ GITHUB_TOKEN is set"
fi
echo ""

# ============================================================================
# WRITE CONFIG
# ============================================================================
echo "═══════════════════════════════════════════════════════════════"
echo "                    WRITING CONFIGURATION                       "
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Read template
CONFIG_CONTENT=$(cat "$TEMPLATE_FILE")

# Substitute environment variables
if [ -n "$BRAVE_API_KEY" ]; then
    CONFIG_CONTENT=$(echo "$CONFIG_CONTENT" | sed "s|\${BRAVE_API_KEY}|$BRAVE_API_KEY|g")
fi

if [ -n "$GITHUB_TOKEN" ]; then
    CONFIG_CONTENT=$(echo "$CONFIG_CONTENT" | sed "s|\${GITHUB_TOKEN}|$GITHUB_TOKEN|g")
fi

if [ -n "$DATABASE_URL" ]; then
    CONFIG_CONTENT=$(echo "$CONFIG_CONTENT" | sed "s|\${DATABASE_URL}|$DATABASE_URL|g")
fi

# Backup existing config if present
if [ -f "$CONFIG_FILE" ]; then
    BACKUP_FILE="$CONFIG_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    cp "$CONFIG_FILE" "$BACKUP_FILE"
    echo "📦 Backed up existing config to: $BACKUP_FILE"
fi

# Write new config
echo "$CONFIG_CONTENT" > "$CONFIG_FILE"
echo "✅ Configuration written to: $CONFIG_FILE"
echo ""

# ============================================================================
# SUMMARY
# ============================================================================
echo "═══════════════════════════════════════════════════════════════"
echo "                         SUMMARY                                "
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "🎉 MCP Setup Complete!"
echo ""
echo "Active MCP Servers:"
echo "  ✅ sequential-thinking  - Complex reasoning"
echo "  ✅ memory               - Persistent knowledge graph"
echo "  ✅ fetch                - HTTP requests"
echo "  ✅ filesystem           - File operations"
if [ -n "$BRAVE_API_KEY" ]; then
    echo "  ✅ brave-search         - Web research"
else
    echo "  ❌ brave-search         - Missing BRAVE_API_KEY"
fi
echo ""
echo "Available MCP Tools:"
echo "  • mcp__sequential-thinking__sequentialthinking"
echo "  • mcp__memory__create_entities, search_nodes, read_graph"
echo "  • mcp__fetch__fetch"
echo "  • mcp__filesystem__read_file, write_file, list_directory"
if [ -n "$BRAVE_API_KEY" ]; then
    echo "  • mcp__brave-search__brave_web_search"
    echo "  • mcp__brave-search__brave_local_search"
fi
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "⚡ Next Steps:"
echo "   1. Restart the Telegram agent: sudo systemctl restart telegram-agent"
echo "   2. Test with: /status in Telegram"
echo ""
