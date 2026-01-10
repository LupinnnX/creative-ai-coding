# NOVA v7.0 Setup Guide
## VPS Installation & Configuration

**Version**: 7.0.0 | **Date**: January 2026 | **OS**: Ubuntu 22.04+

---

## Prerequisites

- Ubuntu 22.04 LTS or newer
- 4GB+ RAM (8GB recommended)
- 20GB+ disk space
- Root or sudo access
- Node.js 20+ (for the main project)
- Python 3.11+ (for Graphiti)

---

## Quick Start (TL;DR)

```bash
# Run everything at once
curl -fsSL https://raw.githubusercontent.com/your-repo/nova-setup.sh | bash

# Or step by step below...
```

---

## Step 1: System Updates

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential tools
sudo apt install -y curl wget git build-essential software-properties-common
```

---

## Step 2: Install Node.js 20+

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should be v20.x.x
npm --version
```

---

## Step 3: Install Python 3.11+

```bash
# Add deadsnakes PPA for latest Python
sudo add-apt-repository ppa:deadsnakes/ppa -y
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# Set as default (optional)
sudo update-alternatives --install /usr/bin/python3 python3 /usr/bin/python3.11 1

# Verify
python3 --version  # Should be 3.11.x
```

---

## Step 4: Install Neo4j (for Graphiti)

### Option A: Docker (Recommended)

```bash
# Install Docker if not present
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Run Neo4j container
docker run -d \
  --name neo4j \
  --restart unless-stopped \
  -p 7474:7474 \
  -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/nova_password_2026 \
  -e NEO4J_PLUGINS='["apoc"]' \
  -v neo4j_data:/data \
  -v neo4j_logs:/logs \
  neo4j:5.15-community

# Wait for startup (30 seconds)
sleep 30

# Verify Neo4j is running
curl -s http://localhost:7474 | head -5
```

### Option B: Native Installation

```bash
# Add Neo4j repository
wget -O - https://debian.neo4j.com/neotechnology.gpg.key | sudo apt-key add -
echo 'deb https://debian.neo4j.com stable latest' | sudo tee /etc/apt/sources.list.d/neo4j.list
sudo apt update

# Install Neo4j
sudo apt install -y neo4j

# Set initial password
sudo neo4j-admin dbms set-initial-password nova_password_2026

# Start Neo4j
sudo systemctl enable neo4j
sudo systemctl start neo4j

# Verify
sudo systemctl status neo4j
```

---

## Step 5: Install Graphiti

```bash
# Create Python virtual environment
python3 -m venv ~/.nova-venv
source ~/.nova-venv/bin/activate

# Install Graphiti
pip install graphiti-core

# Install additional dependencies
pip install neo4j python-dotenv openai anthropic

# Verify
python -c "from graphiti_core import Graphiti; print('Graphiti OK')"
```

---

## Step 6: Install SQLite (Usually Pre-installed)

```bash
# SQLite is typically pre-installed on Ubuntu
sqlite3 --version

# If not installed:
sudo apt install -y sqlite3 libsqlite3-dev
```

---

## Step 7: Create NOVA Database Schema

```bash
# Navigate to project
cd /path/to/your/project

# Create SQLite database
sqlite3 .nova/nova_memory.db << 'EOF'

-- Episodic Memory (What happened)
CREATE TABLE IF NOT EXISTS episodic_memory (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    agent TEXT NOT NULL,
    event_type TEXT NOT NULL,
    action TEXT NOT NULL,
    context TEXT,
    outcome TEXT,
    lesson TEXT,
    tags TEXT,
    embedding BLOB,
    access_count INTEGER DEFAULT 0,
    last_accessed TEXT,
    importance INTEGER DEFAULT 50,
    archived INTEGER DEFAULT 0,
    archived_at TEXT
);

-- Procedural Memory (How we do things)
CREATE TABLE IF NOT EXISTS procedural_memory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    agent TEXT NOT NULL,
    steps TEXT NOT NULL,
    prerequisites TEXT,
    triggers TEXT,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0.5,
    version INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_used TEXT
);

-- Reflections (Learning from failures)
CREATE TABLE IF NOT EXISTS reflections (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    agent TEXT NOT NULL,
    task_type TEXT NOT NULL,
    task_description TEXT,
    attempt_number INTEGER,
    outcome TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    specific_error TEXT,
    correction_action TEXT NOT NULL,
    correction_reasoning TEXT,
    correction_confidence REAL,
    embedding BLOB,
    keywords TEXT,
    times_retrieved INTEGER DEFAULT 0,
    times_helped INTEGER DEFAULT 0,
    times_failed INTEGER DEFAULT 0,
    effectiveness_score REAL DEFAULT 0.5
);

-- Steering Evolution (Track changes)
CREATE TABLE IF NOT EXISTS steering_evolution (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    agent TEXT,
    change_type TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    triggered_by TEXT,
    confidence REAL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_episodic_agent ON episodic_memory(agent);
CREATE INDEX IF NOT EXISTS idx_episodic_type ON episodic_memory(event_type);
CREATE INDEX IF NOT EXISTS idx_episodic_timestamp ON episodic_memory(timestamp);
CREATE INDEX IF NOT EXISTS idx_procedural_agent ON procedural_memory(agent);
CREATE INDEX IF NOT EXISTS idx_reflections_agent ON reflections(agent);
CREATE INDEX IF NOT EXISTS idx_reflections_task_type ON reflections(task_type);

-- Verify tables
.tables

EOF

echo "✅ SQLite database created at .nova/nova_memory.db"
```

---

## Step 8: Environment Configuration

Create `.nova/.env` file:

```bash
cat > .nova/.env << 'EOF'
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=nova_password_2026

# OpenAI (for embeddings - optional, can use local)
OPENAI_API_KEY=sk-your-openai-key-here

# Anthropic (for Claude - optional)
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here

# Graphiti Configuration
GRAPHITI_EMBEDDING_MODEL=text-embedding-3-small
GRAPHITI_LLM_MODEL=gpt-4o-mini

# SQLite Path
NOVA_SQLITE_PATH=.nova/nova_memory.db

# Memory Settings
NOVA_MEMORY_HOT_TTL=3600
NOVA_MEMORY_WARM_TTL=86400
NOVA_MEMORY_COLD_TTL=604800

# Self-Improvement Settings
NOVA_REFLEXION_ENABLED=true
NOVA_AUTO_STEERING_ENABLED=true
NOVA_CONFIDENCE_THRESHOLD=0.7
EOF

echo "✅ Environment file created at .nova/.env"
```

---

## Step 9: Test Graphiti Connection

```bash
# Activate virtual environment
source ~/.nova-venv/bin/activate

# Test script
python3 << 'EOF'
import asyncio
from graphiti_core import Graphiti
from graphiti_core.nodes import EpisodeType
import os
from dotenv import load_dotenv

load_dotenv('.nova/.env')

async def test_graphiti():
    try:
        # Initialize Graphiti
        graphiti = Graphiti(
            neo4j_uri=os.getenv('NEO4J_URI', 'bolt://localhost:7687'),
            neo4j_user=os.getenv('NEO4J_USER', 'neo4j'),
            neo4j_password=os.getenv('NEO4J_PASSWORD', 'nova_password_2026')
        )
        
        # Build indices (first time only)
        await graphiti.build_indices()
        
        # Add test episode
        await graphiti.add_episode(
            name="test_episode",
            episode_body="NOVA v7.0 setup test - Graphiti connection successful",
            source=EpisodeType.message,
            source_description="Setup verification"
        )
        
        # Search to verify
        results = await graphiti.search("NOVA setup test")
        
        print("✅ Graphiti connection successful!")
        print(f"   Found {len(results)} results")
        
        # Close connection
        await graphiti.close()
        
    except Exception as e:
        print(f"❌ Graphiti connection failed: {e}")
        raise

asyncio.run(test_graphiti())
EOF
```

---

## Step 10: Install Project Dependencies

```bash
# Navigate to project root
cd /path/to/your/project

# Install Node.js dependencies
npm install

# Install additional dependencies for NOVA memory
npm install better-sqlite3 @types/better-sqlite3
npm install neo4j-driver
npm install uuid

# Build project
npm run build
```

---

## Step 11: Configure MCP Servers (Optional)

Add to your MCP configuration (`~/.kiro/settings/mcp.json` or workspace):

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "disabled": false
    },
    "sequential-thinking": {
      "command": "npx", 
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      "disabled": false
    },
    "brave-search": {
      "command": "npx",
      "args": ["-y", "@anthropic/mcp-server-brave-search"],
      "env": {
        "BRAVE_API_KEY": "your-brave-api-key"
      },
      "disabled": false
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp"],
      "disabled": false
    }
  }
}
```

---

## Step 12: Verify Installation

```bash
# Run verification script
cat > /tmp/nova-verify.sh << 'EOF'
#!/bin/bash
echo "🔍 NOVA v7.0 Installation Verification"
echo "======================================="

# Check Node.js
echo -n "Node.js: "
node --version 2>/dev/null || echo "❌ Not installed"

# Check Python
echo -n "Python: "
python3 --version 2>/dev/null || echo "❌ Not installed"

# Check Neo4j
echo -n "Neo4j: "
if curl -s http://localhost:7474 > /dev/null 2>&1; then
    echo "✅ Running on port 7474"
else
    echo "❌ Not running"
fi

# Check SQLite database
echo -n "SQLite DB: "
if [ -f ".nova/nova_memory.db" ]; then
    echo "✅ Found at .nova/nova_memory.db"
else
    echo "❌ Not found"
fi

# Check environment file
echo -n "Environment: "
if [ -f ".nova/.env" ]; then
    echo "✅ Found at .nova/.env"
else
    echo "❌ Not found"
fi

# Check Graphiti
echo -n "Graphiti: "
source ~/.nova-venv/bin/activate 2>/dev/null
python3 -c "from graphiti_core import Graphiti; print('✅ Installed')" 2>/dev/null || echo "❌ Not installed"

echo ""
echo "======================================="
echo "Setup complete! Run 'npm run dev' to start."
EOF

chmod +x /tmp/nova-verify.sh
/tmp/nova-verify.sh
```

---

## API Keys Required

| Service | Required | Purpose | Get Key |
|---------|----------|---------|---------|
| OpenAI | Optional | Embeddings, LLM | https://platform.openai.com/api-keys |
| Anthropic | Optional | Claude models | https://console.anthropic.com/ |
| Brave Search | Optional | Web research | https://brave.com/search/api/ |
| Neo4j Aura | Optional | Cloud Neo4j | https://neo4j.com/cloud/aura/ |

**Note**: You can run NOVA without API keys using local models, but embeddings and some features will be limited.

---

## Troubleshooting

### Neo4j won't start
```bash
# Check logs
docker logs neo4j

# Or for native install
sudo journalctl -u neo4j -f
```

### Graphiti connection fails
```bash
# Verify Neo4j is accessible
curl http://localhost:7474

# Check credentials
cypher-shell -u neo4j -p nova_password_2026 "RETURN 1"
```

### SQLite permission errors
```bash
# Fix permissions
chmod 644 .nova/nova_memory.db
chmod 755 .nova/
```

### Python virtual environment issues
```bash
# Recreate venv
rm -rf ~/.nova-venv
python3 -m venv ~/.nova-venv
source ~/.nova-venv/bin/activate
pip install graphiti-core neo4j python-dotenv
```

---

## Systemd Service (Production)

Create `/etc/systemd/system/nova-neo4j.service`:

```ini
[Unit]
Description=Neo4j for NOVA
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
ExecStart=/usr/bin/docker start neo4j
ExecStop=/usr/bin/docker stop neo4j

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable nova-neo4j
sudo systemctl start nova-neo4j
```

---

## Quick Reference

```bash
# Start Neo4j (Docker)
docker start neo4j

# Stop Neo4j
docker stop neo4j

# Access Neo4j Browser
open http://localhost:7474

# Activate Python venv
source ~/.nova-venv/bin/activate

# Run Graphiti test
python -c "from graphiti_core import Graphiti; print('OK')"

# Check SQLite
sqlite3 .nova/nova_memory.db ".tables"

# View environment
cat .nova/.env
```

---

## Next Steps After Setup

1. ✅ Verify all services running (`/tmp/nova-verify.sh`)
2. 🔄 Start the main application (`npm run dev`)
3. 🧪 Test memory operations
4. 📊 Check dashboard (`.nova/DASHBOARD.md`)
5. 🚀 Begin Phase 2: Memory System implementation

---

*"Infrastructure ready. Time to build the future."*

⭐ POLARIS Ξ8890 + 🔭 VEGA Ξ172167
