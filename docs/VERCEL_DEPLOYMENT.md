# Vercel Deployment System

> Sophisticated Vercel configuration for preview and production deployments via Telegram.

## Overview

The Vercel deployment system provides comprehensive control over Vercel deployments directly from Telegram, including:

- **Per-user token management** - Each user can configure their own Vercel token
- **Preview vs Production** - Deploy to preview or production environments
- **GitHub → Vercel Direct** - Deploy any GitHub repo without local clone (NEW!)
- **Environment variables** - Configure build-time and runtime env vars
- **Debug mode** - Verbose output for troubleshooting
- **Archive mode** - Optimized uploads for large projects
- **Region selection** - Control where your functions run

## Quick Start

### 1. Get Your Vercel Token

1. Go to [Vercel Account Tokens](https://vercel.com/account/tokens)
2. Click "Create Token"
3. Give it a name (e.g., "Telegram Bot")
4. Copy the token

### 2. Configure in Telegram

```
/vercel_setup your_token_here
```

### 3. Deploy

```
/preview dist              # Deploy local directory
/preview owner/repo        # Deploy GitHub repo directly (NEW!)
/preview owner/repo#branch # Deploy specific branch (NEW!)
/preview_prod dist         # Production deployment
```

## GitHub → Vercel Direct Deployment (NEW!)

Deploy any GitHub repository directly to Vercel without cloning locally.

### Usage

```
/preview owner/repo           # Deploy default branch
/preview owner/repo#branch    # Deploy specific branch
/preview owner/repo#feature   # Deploy feature branch
/preview_prod owner/repo      # Production deployment
```

### Examples

```
/preview vercel/next.js           # Deploy Next.js repo
/preview facebook/react#main      # Deploy React main branch
/preview my-org/my-app#develop    # Deploy develop branch
```

### How It Works

1. Fetches repository tree via GitHub API
2. Auto-detects framework (Next.js, Vite, Remix, etc.)
3. Uploads files directly to Vercel API
4. Vercel builds and deploys automatically
5. Returns preview URL

### Supported Frameworks (Auto-Detected)

- Next.js
- Vite
- Remix
- Astro
- Nuxt
- SvelteKit
- Gatsby
- Angular
- Vue
- Create React App
- Solid.js

### Requirements

- GitHub token configured: `/github_token <token>`
- Vercel token configured: `/vercel_setup <token>`

## Commands Reference

### Setup Commands

| Command | Description |
|---------|-------------|
| `/vercel` | Show help and current status |
| `/vercel_setup <token>` | Set your Vercel token |
| `/vercel_setup project <name>` | Link to a Vercel project |
| `/vercel_setup org <id>` | Set team/organization ID |
| `/vercel_setup clear` | Remove your configuration |
| `/vercel_setup default on\|off` | Use server token as fallback |
| `/vercel_status` | Show full configuration |

### Deployment Commands

| Command | Description |
|---------|-------------|
| `/vercel [dir]` | Deploy to preview environment |
| `/vercel_prod [dir]` | Deploy to production environment |

### Configuration Commands

| Command | Description |
|---------|-------------|
| `/vercel_debug on\|off` | Toggle verbose debug output |
| `/vercel_archive on\|off` | Enable archive mode for large projects |
| `/vercel_regions <regions>` | Set deployment regions (e.g., `sfo1,iad1`) |

### Environment Variable Commands

| Command | Description |
|---------|-------------|
| `/vercel_env` | List all configured env vars |
| `/vercel_env add KEY=value [build\|runtime]` | Add environment variable |
| `/vercel_env remove KEY [build\|runtime]` | Remove environment variable |
| `/vercel_env clear` | Remove all environment variables |

## Environment Variables

### Build-time vs Runtime

- **Build-time** (`--build-env`): Available during the build process
- **Runtime** (`--env`): Available when your application runs

### Examples

```
# Add runtime env var (default)
/vercel_env add API_URL=https://api.example.com

# Add build-time env var
/vercel_env add NODE_ENV=production build

# Add database URL for runtime
/vercel_env add DATABASE_URL=postgres://user:pass@host:5432/db runtime
```

## Debug Mode

Enable debug mode to see verbose output from Vercel CLI:

```
/vercel_debug on
/vercel dist
```

Debug output includes:
- Full CLI command being executed
- Upload progress
- Build logs
- Deployment details
- Error stack traces

## Archive Mode

For projects with 1000+ files, enable archive mode to compress files before upload:

```
/vercel_archive on
/vercel dist
```

This helps avoid rate limits and speeds up uploads for large projects.

## Region Selection

Control where your serverless functions run:

```
# Set specific regions
/vercel_regions sfo1,iad1

# Clear (use Vercel auto-selection)
/vercel_regions clear
```

### Common Regions

| Region | Location |
|--------|----------|
| `sfo1` | San Francisco, USA |
| `iad1` | Washington D.C., USA |
| `cdg1` | Paris, France |
| `hnd1` | Tokyo, Japan |
| `syd1` | Sydney, Australia |

## Team/Organization Deployment

If you're deploying to a team account:

```
/vercel_setup org team_xxxxxxxxxxxxx
```

Get your team ID from your Vercel dashboard URL or team settings.

## Error Handling

### Common Errors

**Invalid Token**
```
❌ Invalid or expired token.
Fix: /vercel_setup <new-token>
```

**Rate Limited**
```
⏱️ Rate limited. Wait a few minutes and try again.
Free tier: 100 deployments/day
```

**Build Failed**
```
❌ Build failed
💡 Enable debug: /vercel_debug on
```

### Troubleshooting

1. **Enable debug mode** to see detailed output
2. **Check your token** is valid and not expired
3. **Verify build directory** exists and contains deployable content
4. **Check rate limits** if you've done many deployments

## Server Configuration

Server administrators can set a default Vercel token in `.env`:

```env
VERCEL_TOKEN=your_server_token
```

Users can then choose to use the server token or their own:

```
/vercel_setup default on   # Use server token
/vercel_setup default off  # Require personal token
```

## Security

- Tokens are stored per-user in session metadata
- Tokens are never logged or exposed in error messages
- Tokens are passed via environment variable to CLI
- Environment variable values are masked in display

## Architecture

The system uses the Vercel CLI with dynamically built command flags:

```
vercel <dir> --yes [--prod] [--debug] [--archive=tgz] 
  [--scope <org>] [--regions <regions>]
  [--build-env KEY=value]... [--env KEY=value]...
```

This approach provides:
- Full CLI feature support
- No additional dependencies
- Reliable deployment process
- Easy debugging

---

*NOVA Framework v6.0 - POLARIS + VEGA + ANTARES Implementation*
