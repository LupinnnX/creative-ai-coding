# Creative AI-Driven Coding

> Code from anywhere. Ship legendary work.

Creative AI-Driven Coding is a remote development platform that puts enterprise-grade AI coding assistants at your fingertips—whether you're on your phone, reviewing a GitHub issue, or away from your workstation. Built for developers who refuse to let location limit their productivity.

## Why This Exists

We've all been there: a critical bug surfaces while you're commuting, a brilliant solution strikes during lunch, or you need to push a quick fix from your tablet. Traditional IDEs chain you to your desk. This platform breaks those chains.

Connect to **Droid** (Factory's enterprise AI assistant) or **GLM-4.7** through Telegram, GitHub, or any platform you prefer. Your AI coding partner travels with you.

---

## Meet Team NOVA

At the heart of this platform lives **NOVA** (Network of Virtual Agents)—a constellation of 6 specialized AI agents that transform how complex development tasks get done.

### The Antigravity 6

| Agent | Role | Superpower |
|-------|------|------------|
| ⭐ **POLARIS** | Strategic Commander | Orchestrates multi-agent missions, decomposes complexity |
| 🔭 **VEGA** | Navigator & Architect | First-principles research, technology decisions |
| ✨ **SIRIUS** | Design Sovereign | UI/UX excellence, accessibility champion |
| 🔷 **RIGEL** | Frontend Prime | React mastery, 60fps interactions, type-safety |
| ❤️ **ANTARES** | Backend Prime | APIs, databases, distributed systems |
| 🛡️ **ARCTURUS** | Guardian | Security, testing, quality gates |

**SIRIUS** and **ARCTURUS** hold veto power—nothing ships with broken UX or security holes.

### Why NOVA Matters

Traditional AI assistants are generalists. NOVA agents are specialists who collaborate:

- **POLARIS** breaks down "build user authentication" into research, design, frontend, backend, and security tasks
- **VEGA** investigates which auth pattern fits your stack
- **SIRIUS** ensures the login flow feels intuitive
- **RIGEL** and **ANTARES** implement in parallel with a shared API contract
- **ARCTURUS** validates everything before it ships

One command activates this entire workflow:

```
/activate POLARIS Build a secure user authentication system
```

---

## Core Features

**Multi-Platform Access**  
Telegram for mobile coding, GitHub webhooks for issue-driven development, extensible to Slack, Discord, and beyond.

**Persistent Sessions**  
Your AI remembers context across messages and survives container restarts. Pick up exactly where you left off.

**Enterprise AI Integration**  
Factory's Droid with GLM-4.7 support, or bring your own models. Configurable reasoning effort, autonomy levels, and spec modes.

**Git-Versioned Commands**  
Define custom workflows in markdown files. Version them with your code. Share them with your team.

**The Antigravity Loop**  
Every significant output passes through NOVA's cognitive cycle: draft → self-correct → critique → refine → verify. No half-baked solutions.

---

## Quick Start

```bash
git clone https://github.com/LupinnnX/creative-ai-coding.git
cd creative-ai-coding
cp .env.example .env
```

### Essential Configuration

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `GH_TOKEN` | GitHub access for repo cloning |
| `TELEGRAM_BOT_TOKEN` | Your Telegram bot (via [@BotFather](https://t.me/BotFather)) |
| `FACTORY_API_KEY` | Factory/Droid API key |

### Launch

```bash
# With Docker (recommended)
docker compose --profile with-db up -d --build

# Local development
npm install && npm run dev
```

---

## Usage

### Basic Commands

| Command | What It Does |
|---------|--------------|
| `/clone <url>` | Clone a GitHub repository |
| `/status` | Show current session state |
| `/help` | List all available commands |

### NOVA Commands

| Command | What It Does |
|---------|--------------|
| `/team` | Meet the Antigravity 6 |
| `/activate <agent> <mission>` | Activate a specialist |
| `/constellation <agents> <mission>` | Multi-agent collaboration |
| `/handoff <agent> <context>` | Transfer work between agents |

### Example Workflow

```
You: /clone https://github.com/yourname/project

Bot: ✅ Repository cloned! Found 5 commands in .agents/commands/

You: /activate POLARIS Add dark mode support

Bot: ⭐ POLARIS activated. Analyzing codebase structure...
     
     📋 Mission decomposed:
     1. VEGA → Research theming patterns
     2. SIRIUS → Design color system
     3. RIGEL → Implement theme toggle
     4. ARCTURUS → Validate accessibility

     Initiating sequential chain...
```

---

## Architecture

```
┌─────────────────────────────────────────────┐
│     Platform Adapters (Telegram, GitHub)    │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│              Orchestrator                   │
│    + NOVA Steering Loader                   │
│    + Antigravity Loop v2.0                  │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│         Droid AI Assistant                  │
│    (GLM-4.7 / GPT-5.2 / Custom Models)     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│            PostgreSQL                       │
│   Codebases • Conversations • Sessions      │
└─────────────────────────────────────────────┘
```

---

## Deployment

### Docker (Recommended)

```bash
docker compose --profile with-db up -d --build
docker compose logs -f app-with-db
```

### VPS with systemd

```bash
ssh user@your-vps
git clone https://github.com/LupinnnX/creative-ai-coding.git
cd creative-ai-coding
sudo bash scripts/vps-setup.sh
sudo systemctl start telegram-agent
```

See [Cloud Deployment Guide](docs/cloud-deployment.md) for detailed instructions.

---

## Documentation

| Guide | Description |
|-------|-------------|
| [Architecture](docs/architecture.md) | System design and extension points |
| [NOVA Integration](docs/NOVA_INTEGRATION.md) | Deep dive into multi-agent coordination |
| [NOVA User Guide](docs/NOVA_USER_GUIDE.md) | Complete NOVA command reference |
| [Cloud Deployment](docs/cloud-deployment.md) | Production deployment on VPS |

---

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript (strict mode)
- **AI**: Factory Droid CLI, GLM-4.7, GPT-5.2
- **Database**: PostgreSQL
- **Platforms**: Telegraf (Telegram), Octokit (GitHub)
- **Framework**: NOVA v6.0 (Antigravity Loop)

---

## Contributing

We welcome contributions! The codebase follows:

- TypeScript strict mode (no `any` types)
- Prettier + ESLint formatting
- Jest for testing
- 100-character line limit

```bash
npm run lint      # Check code style
npm run test      # Run tests
npm run build     # Build for production
```

---

## License

Dual licensed under [MIT](LICENSE) and CC BY-NC-SA 4.0.

---

<p align="center">
  <em>"Activate with keywords. Ship legendary work."</em>
  <br><br>
  <strong>NOVA Framework v6.0</strong> • Built by <a href="https://github.com/LupinnnX">LupinnnX</a>
</p>
