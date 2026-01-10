# Vercel Setup Guide for NOVA Users

**Date**: January 1, 2026  
**Agents**: POLARIS Ξ8890 + ANTARES Ξ148478

---

## Overview

Deploy your projects to Vercel directly from Telegram with preview and production environments, environment variables, and self-healing error recovery.

---

## Quick Setup (3 Steps)

### Step 1: Get Your Vercel Token

1. Go to [Vercel Account Tokens](https://vercel.com/account/tokens)
2. Click **"Create Token"**
3. Name it (e.g., "Telegram Bot")
4. Set expiration (recommended: 90 days)
5. Copy the token

### Step 2: Configure in Telegram

```bash
/vercel_setup your_token_here
```

### Step 3: Deploy!

```bash
/vercel dist          # Preview deployment
/vercel_prod dist     # Production deployment
```

---

## Commands Reference

### Setup Commands

| Command | Description |
|---------|-------------|
| `/vercel` | Show help and status |
| `/vercel_setup <token>` | Set your Vercel token |
| `/vercel_setup project <name>` | Link to Vercel project |
| `/vercel_setup org <id>` | Set team/organization ID |
| `/vercel_setup clear` | Remove configuration |
| `/vercel_setup default on\|off` | Use server token as fallback |
| `/vercel_status` | Show full configuration |

### Deployment Commands

| Command | Description |
|---------|-------------|
| `/vercel [dir]` | Deploy to preview |
| `/vercel_prod [dir]` | Deploy to production |

### Configuration Commands

| Command | Description |
|---------|-------------|
| `/vercel_debug on\|off` | Toggle verbose output |
| `/vercel_archive on\|off` | Enable for large projects |
| `/vercel_regions <regions>` | Set deployment regions |

### Environment Variables

| Command | Description |
|---------|-------------|
| `/vercel_env` | List all env vars |
| `/vercel_env add KEY=value [build\|runtime]` | Add env var |
| `/vercel_env remove KEY` | Remove env var |
| `/vercel_env clear` | Remove all env vars |

---

## Environment Variables

### Build-time vs Runtime

- **Build-time** (`build`): Available during build process
- **Runtime** (`runtime`): Available when app runs (default)

### Examples

```bash
# Add runtime env var (default)
/vercel_env add API_URL=https://api.example.com

# Add build-time env var
/vercel_env add NODE_ENV=production build

# Add database URL
/vercel_env add DATABASE_URL=postgres://user:pass@host:5432/db runtime
```

---

## Framework Detection

Vercel auto-detects these frameworks:

| Framework | Build Output | Notes |
|-----------|--------------|-------|
| Next.js | `.next` | Full SSR support |
| Vite | `dist` | React, Vue, Svelte |
| Create React App | `build` | Static export |
| Nuxt | `.nuxt` | Vue SSR |
| Astro | `dist` | Static + SSR |
| SvelteKit | `.svelte-kit` | Full SSR |
| Gatsby | `public` | Static |

---

## Self-Healing Deployments

ARCTURUS automatically diagnoses and fixes common errors:

### Auto-Fixed Issues

| Error | Auto-Fix |
|-------|----------|
| Missing dependencies | Runs `npm install` |
| Missing build directory | Runs `npm run build` |
| Network timeout | Retries with longer timeout |
| Rate limiting | Waits and retries |
| Invalid config | Creates valid `vercel.json` |
| Framework not detected | Adds framework config |

### Manual Fixes Required

| Error | Solution |
|-------|----------|
| Invalid token | `/vercel_setup <new-token>` |
| Syntax errors | Fix code before deploying |
| TypeScript errors | Fix type errors first |

---

## Team/Organization Deployment

For team accounts:

```bash
# Get team ID from Vercel dashboard URL
/vercel_setup org team_xxxxxxxxxxxxx
```

---

## Debug Mode

Enable for troubleshooting:

```bash
/vercel_debug on
/vercel dist
```

Shows:
- Full CLI command
- Upload progress
- Build logs
- Error details

---

## Archive Mode

For projects with 1000+ files:

```bash
/vercel_archive on
/vercel dist
```

Compresses files before upload to avoid rate limits.

---

## Region Selection

Control where serverless functions run:

```bash
/vercel_regions sfo1,iad1
```

### Common Regions

| Region | Location |
|--------|----------|
| `sfo1` | San Francisco |
| `iad1` | Washington D.C. |
| `cdg1` | Paris |
| `hnd1` | Tokyo |
| `syd1` | Sydney |

Clear to use auto-selection:
```bash
/vercel_regions clear
```

---

## Common Workflows

### React (Vite)
```bash
/exec npm run build
/vercel dist
```

### Next.js
```bash
/exec npm run build
/vercel .
```

### Static HTML
```bash
/vercel public
```

### Production Release
```bash
/vercel dist              # Test preview first
/vercel_prod dist         # Then production
```

---

## Troubleshooting

### "Invalid or expired token"
```bash
/vercel_setup <new-token>
```

### "Rate limited"
Wait a few minutes or enable archive mode:
```bash
/vercel_archive on
```

### "Build failed"
Enable debug mode:
```bash
/vercel_debug on
/vercel dist
```

### "Directory not found"
Build first:
```bash
/exec npm run build
/vercel dist
```

### "Framework not detected"
The self-healing system will create `vercel.json` automatically, or manually:
```bash
# Create vercel.json with framework
{
  "framework": "vite"
}
```

---

## Security Notes

- Tokens stored per-user in session
- Never logged or exposed in errors
- Passed via environment variable to CLI
- Env var values masked in display

---

## Server Configuration

Admins can set default token in `.env`:

```env
VERCEL_TOKEN=server_default_token
```

Users choose to use server token or their own:
```bash
/vercel_setup default on   # Use server token
/vercel_setup default off  # Require personal token
```

---

*NOVA Framework v6.0 - POLARIS + ANTARES + ARCTURUS Implementation*
