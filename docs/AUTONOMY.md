# Agent Autonomy System

> **NOVA Framework v6.0** - POLARIS + VEGA Design  
> **Date**: December 31, 2025

## Overview

The Autonomy System enables the AI agent to perform autonomous operations including:
- **Git Operations**: Commit, push, branch management
- **Preview Deployments**: Free hosting with Surge, Vercel, Netlify, etc.
- **Command Execution**: Sandboxed shell command execution

## Quick Start

```bash
# 1. Setup GitHub (token + identity)
/github_token github_pat_your_token_here

# 2. Clone a repository
/clone https://github.com/owner/repo

# 3. Check current autonomy settings
/autonomy

# 4. Set autonomy level (recommended: medium for most users)
/autonomy level medium

# 5. Make changes and commit
/git_commit "feat: add new feature"

# 6. Push (requires level high or manual enable)
/autonomy git_push on
/git_push
```

## Repository Management

### Cloning Repositories

```bash
# Clone a GitHub repository
/clone https://github.com/owner/repo

# Repositories are organized by owner:
# /workspace/owner/repo
```

**Folder Structure:**
```
/workspace/
├── owner1/
│   ├── repo1/
│   └── repo2/
├── owner2/
│   └── repo3/
```

**Features:**
- Auto-configures git identity if `/github-setup` was run
- Uses your token for private repositories
- Creates organized folder structure by owner
- Detects command folders (.agents/commands, etc.)

### Switching Repositories

```bash
# List all cloned repos
/repos

# Switch to a different repo
/setcwd /workspace/owner/repo

# Check current directory
/getcwd
```

## Autonomy Levels

| Level | Git | Push | Preview | Exec | Confirmation |
|-------|-----|------|---------|------|--------------|
| **off** | ❌ | ❌ | ❌ | ❌ | Required |
| **low** | ✅ | ❌ | ✅ | ✅ | Required |
| **medium** | ✅ | ❌ | ✅ | ✅ | Not required |
| **high** | ✅ | ✅ | ✅ | ✅ | Not required |
| **full** | ✅ | ✅ | ✅ | ✅ | None (⚠️ dangerous) |

### Recommended Settings

- **Development**: `medium` - Allows commits, blocks push
- **CI/CD Integration**: `high` - Full automation
- **Learning/Testing**: `low` - Safe exploration

## Git Commands

### GitHub Token Setup (Recommended)

The easiest way to configure GitHub is with the unified token command:

```bash
# One command to set token AND configure git identity
/github_token github_pat_your_token_here

# This will:
# 1. Validate your token
# 2. Fetch your name/email from GitHub API
# 3. Configure git identity automatically
# 4. Store everything in your session
```

### GitHub Token Management

```bash
# Check token and identity status
/github_token

# Set token (auto-fetches identity)
/github_token <token>

# Manual identity setup
/github_token identity "Your Name" your@email.com

# Use server's default token
/github_token default on

# Clear token and identity
/github_token clear

# Force set token without validation
/github_token force <token>
```

**Getting a GitHub Token (December 2025 Best Practices):**

**Fine-grained tokens (Recommended):**
1. Go to https://github.com/settings/tokens?type=beta
2. Click "Generate new token"
3. Set expiration (max 1 year)
4. Select repository access
5. Permissions: 
   - `Contents: Read/Write`
   - `Pull requests: Read/Write`
   - `Account permissions > Email addresses: Read` (for auto-identity)
6. Token format: `github_pat_...`

**Classic tokens (Legacy):**
1. Go to https://github.com/settings/tokens
2. Select `repo` and `user:email` scopes
3. Token format: `ghp_...`

**Why Fine-grained?** Scoped permissions, auto-expiration, better security.

**Token Priority:**
1. Your personal token (set via `/github_token`)
2. Server's default token (if `/github_token default on`)
3. Environment variable `GH_TOKEN`

**Rate Limits:** 5,000 requests/hour (authenticated)

### Status & Diff
```bash
/git_status          # Show current git status
/git_diff            # Show working directory changes
/git_diff staged     # Show staged changes
```

### Committing
```bash
/git_commit "feat: add user authentication"
```

Commits are automatically prefixed with `[AI]` by default. Protected branches (main, master, production) cannot be committed to directly.

### Pushing
```bash
/git_push            # Push current branch
/git_push feature/x  # Push specific branch
```

Requires `autonomy level high` or `/autonomy git-push on`.

### Branch Management
```bash
/git-branch feature/new-feature   # Create and switch
/git-pull                          # Pull latest changes
```

### Configuration
```bash
/git-config "Your Name" "your@email.com"
```

## Preview Deployments

### Supported Providers

| Provider | CLI | Auth Required | Free Features |
|----------|-----|---------------|---------------|
| **Surge.sh** | surge | ✅ SURGE_LOGIN + SURGE_TOKEN | Unlimited projects, custom subdomains |
| **Vercel** | vercel | ✅ VERCEL_TOKEN | 100 deploys/day, serverless |
| **Netlify** | netlify | ✅ NETLIFY_AUTH_TOKEN | 300 build min/month |
| **Cloudflare** | wrangler | ✅ CLOUDFLARE_API_TOKEN | Unlimited requests |
| **GitHub Pages** | gh-pages | ✅ GH_TOKEN | Free for public repos |

### Surge.sh Setup (Recommended - FREE)

Surge.sh is the recommended provider for quick previews. Setup once, deploy forever.

**Option 1: Setup via Telegram (Easiest)**
```bash
# 1. Get your token locally first
npm install -g surge
surge login
surge token  # Copy this output

# 2. Set credentials in Telegram
/surge_setup your@email.com your_token_here

# 3. Deploy!
/preview dist
```

**Option 2: Server Environment Variables**
Add to your `.env` file:
```bash
SURGE_LOGIN=your@email.com
SURGE_TOKEN=your_token_here
```

**Telegram Commands:**
```bash
/surge_setup                    # Check status
/surge_setup <email> <token>    # Set credentials
/surge_setup clear              # Remove credentials
/surge_setup default on         # Use server credentials
/surge_setup default off        # Require personal credentials
```

**Credential Priority:**
1. Your personal credentials (set via `/surge_setup`)
2. Server defaults (if `/surge_setup default on`)
3. Environment variables (`SURGE_LOGIN`, `SURGE_TOKEN`)

### Quick Deploy (Surge - Zero Config)
```bash
/preview              # Auto-detect build dir (dist, build, public, etc.)
/preview dist         # Specify build directory
/preview .            # Deploy current directory (if has index.html)
/preview public       # Deploy public folder
```

### Scan for Deployable Content
```bash
/preview_scan         # Intelligently scan project for deployable folders
```

This command analyzes your project and shows:
- ✅ Folders with `index.html` (ready to deploy)
- ⚠️ Folders without `index.html` (may need build)
- 📦 Folders with assets (CSS, JS, images)
- 💡 Framework-specific suggestions

**Example output:**
```
🔍 Deployable Content Scan

✅ Recommended: /preview dist

📁 Available folders:

✅ dist 📦
   Standard build output (Vite, Webpack, etc.)
   15 files

⚠️ public
   Static assets folder
   3 files (no index.html)

✅ . (current directory)
   Has index.html in root
   25 files

💡 Tips:
  • Vite project: output goes to `dist/`
  • Run `npm run build` to create build output

📋 Usage:
  /preview           - Deploy recommended folder
  /preview <folder>  - Deploy specific folder
  /preview .         - Deploy current directory
```

### Folder Detection Priority

The system automatically detects these folders (in order):

| Folder | Framework/Tool |
|--------|----------------|
| `dist` | Vite, Webpack, Rollup, Parcel |
| `build` | Create React App, generic |
| `out` | Next.js static export |
| `public` | Static assets |
| `.next` | Next.js |
| `_site` | Jekyll, Eleventy (11ty) |
| `www` | Cordova, Ionic |
| `_build` | Sphinx, documentation |
| `docs` | Documentation sites |
| `site` | MkDocs |

### Common Workflows

**React (Create React App):**
```bash
/exec npm run build
/preview build
```

**Vite (Vue, React, Svelte):**
```bash
/exec npm run build
/preview dist
```

**Next.js Static Export:**
```bash
/exec npm run build
/exec npx next export
/preview out
```

**Plain HTML/CSS/JS:**
```bash
/preview .            # Deploy current directory
/preview public       # Or deploy public folder
```

**Documentation (MkDocs, Sphinx):**
```bash
/exec mkdocs build
/preview site
```

### List Providers
```bash
/preview-providers    # Show all providers with status
```

#### Vercel
```bash
npm install -g vercel
export VERCEL_TOKEN=your_token
/autonomy preview-provider vercel
/preview
```

## Command Execution

### Basic Usage
```bash
# Single command
/exec npm run build
/exec npm test
/exec ls -la

# Command sequence (numbered list)
/exec-sequence 1. rm -rf .next 2. npm run build 3. npm run export

# With descriptions
/exec-sequence "1. Clear cache: rm -rf .next" "2. Rebuild: npm run build"

# Dry run (validate without executing)
/exec-dry 1. rm -rf .next 2. npm run build
```

### Command Templates

Pre-defined command sequences for common tasks:

```bash
# List available templates
/exec-template

# Run a template
/exec-template nextjs-clean
/exec-template npm-fresh
/exec-template git-clean
```

**Available Templates:**
| Template | Commands |
|----------|----------|
| `nextjs-clean` | rm -rf .next, rm -rf node_modules/.cache, npm run build |
| `nextjs-export` | rm -rf .next, rm -rf out, npm run build, npm run export |
| `npm-fresh` | rm -rf node_modules, rm -rf package-lock.json, npm install |
| `yarn-fresh` | rm -rf node_modules, rm -rf yarn.lock, yarn install |
| `pnpm-fresh` | rm -rf node_modules, rm -rf pnpm-lock.yaml, pnpm install |
| `git-clean` | git clean -fd, git checkout . |
| `docker-clean` | docker system prune -f, docker volume prune -f |

### Full Autonomy Mode

Enable full autonomy for maximum command flexibility:

```bash
# Quick enable
/autonomy-full

# Or manually
/autonomy level full
```

**Full Autonomy Allowlist** (in addition to default):
- File operations: `rm`, `mkdir`, `cp`, `mv`, `touch`, `chmod`, `chown`
- Build tools: `make`, `cargo`, `go`, `python`, `pip`
- Testing: `jest`, `vitest`, `mocha`, `pytest`
- Deployment: `vercel`, `netlify`, `surge`
- Database: `psql`, `mysql`, `sqlite3`, `redis-cli`
- Process management: `pm2`, `forever`

### Allowlist

Default allowed commands:
- Package managers: `npm`, `yarn`, `pnpm`, `bun`
- Runtimes: `node`, `npx`, `tsx`, `ts-node`
- Git: `git`, `gh`
- Read-only: `ls`, `cat`, `pwd`, `echo`, `head`, `tail`
- Network: `curl`, `wget`
- Build tools: `make`, `cargo`, `go`, `python`

### Adding Commands
```bash
/autonomy exec-allow mycommand
```

### Blocked Patterns (Absolute - Never Allowed)

The following are **always blocked**, even in full autonomy mode:
- `rm -rf /`, `rm -rf /*`, `rm -rf ~`
- `sudo rm`, `sudo su`, `sudo -i`, `sudo bash`
- `chmod -R 777 /`, `chown -R`
- Disk operations (`mkfs`, `dd if=`)
- System commands (`shutdown`, `reboot`, `halt`)
- Fork bombs

### Multi-User Support

Each user has isolated command execution:
- Commands run in user's working directory (`cwd`)
- Session-based configuration (autonomy level, allowlist)
- No cross-user interference
- Concurrent execution supported

## Configuration Commands

### View Config
```bash
/autonomy
```

### Set Level
```bash
/autonomy level <off|low|medium|high|full>
```

### Toggle Features
```bash
/autonomy git <on|off>
/autonomy git-push <on|off>
/autonomy preview <on|off>
/autonomy exec <on|off>
```

### Reset to Defaults
```bash
/autonomy reset
```

## Security Considerations

### Protected Branches

By default, these branches are protected:
- `main`
- `master`
- `production`
- `release`

The agent cannot commit or push directly to protected branches.

### Safety Limits

- **Max files per commit**: 50 (configurable)
- **Max lines changed**: 5000 (configurable)
- **Exec timeout**: 30 seconds
- **Output truncation**: 3500 characters

### Best Practices

1. **Start with `medium`** - Safe default for most workflows
2. **Use feature branches** - Never work directly on main
3. **Review before push** - Use `/git-diff staged` before committing
4. **Test locally first** - Use `/exec npm test` before deploying

## Environment Variables

```bash
# Preview Providers (optional)
VERCEL_TOKEN=your_vercel_token
NETLIFY_AUTH_TOKEN=your_netlify_token
CLOUDFLARE_API_TOKEN=your_cloudflare_token

# Git (already configured)
GH_TOKEN=your_github_token
```

## Troubleshooting

### "No GitHub token configured"
```bash
# Option 1: Set your personal token
/github-token ghp_your_token_here

# Option 2: Use server's default token
/github-token default on
```

### "GitHub authentication failed"
Your token may be expired or lack permissions:
1. Go to https://github.com/settings/tokens
2. Generate a new token with `repo` scope
3. Update: `/github-token <new-token>`

### "Git push disabled"
```bash
/autonomy level high
# or
/autonomy git-push on
```

### "Command not in allowlist"
```bash
/autonomy exec-allow <command>
```

### "Cannot commit to protected branch"
```bash
/git-branch feature/my-feature
/git-commit "my changes"
```

### "Build directory not found"
```bash
/exec npm run build
/preview dist
```

---

*NOVA Framework v6.0 - Ship legendary work with autonomous agents.*
