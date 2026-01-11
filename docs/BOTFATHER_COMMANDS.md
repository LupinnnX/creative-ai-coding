# BotFather Commands

Paste this into BotFather using `/setcommands`:

```
help - Show all commands
status - Current state and settings
reset - Clear context, start fresh
init - Create new project (local + GitHub)
clone - Clone a repository
repos - List repositories (numbered)
repo - Quick switch + auto-pull
gh_repos - List your GitHub repos
gh_clone - Clone from GitHub with auth
preview - Deploy to Vercel preview
services - List running VPS services
restart - Restart a service
logs - View service logs
deploy_update - Pull + restart service
exec - Run CLI command
context - View token budget
team - Show NOVA agents
activate - Activate NOVA agent
job - Check background job status
jobs - List recent jobs
tutorial - Quick start guide
```

---

## Command Source Files (Agent Context)

Each command links to its implementation for agents to enhance functionality.

### Core Commands
| Command | Description | Source Files |
|---------|-------------|--------------|
| `/help` | Show all available commands | #[[file:src/handlers/command-handler.ts]] |
| `/status` | Current conversation state | #[[file:src/handlers/command-handler.ts]], #[[file:src/db/sessions.ts]] |
| `/reset` | Clear session context | #[[file:src/handlers/command-handler.ts]], #[[file:src/db/sessions.ts]] |

### Repository Commands
| Command | Description | Source Files |
|---------|-------------|--------------|
| `/init <name> [--github]` | Create new project (local + GitHub) | #[[file:src/handlers/command-handler.ts]], #[[file:src/autonomy/github-api.ts]] |
| `/clone <url>` | Clone a GitHub repository | #[[file:src/handlers/command-handler.ts]], #[[file:src/db/codebases.ts]] |
| `/repos` | List repositories (numbered) | #[[file:src/handlers/command-handler.ts]] |
| `/repo <num>` | Quick switch + auto-pull | #[[file:src/handlers/command-handler.ts]], #[[file:src/autonomy/git-operations.ts]] |

### GitHub Commands
| Command | Description | Source Files |
|---------|-------------|--------------|
| `/gh_repos` | List your GitHub repositories | #[[file:src/handlers/command-handler.ts]], #[[file:src/autonomy/github.ts]] |
| `/gh_clone <repo>` | Clone with GitHub token auth | #[[file:src/handlers/command-handler.ts]], #[[file:src/autonomy/github.ts]] |
| `/gh_user` | Your GitHub profile | #[[file:src/autonomy/github.ts]] |
| `/gh_fork <repo>` | Fork a repository | #[[file:src/autonomy/github.ts]] |
| `/gh_create <name>` | Create new repository | #[[file:src/autonomy/github.ts]] |
| `/gh_pr_create` | Create pull request | #[[file:src/autonomy/github.ts]] |

### Deployment Commands
| Command | Description | Source Files |
|---------|-------------|--------------|
| `/preview [dir]` | Deploy to Vercel preview | #[[file:src/handlers/command-handler.ts]], #[[file:src/autonomy/deploy.ts]], #[[file:src/api/vercel-api.ts]] |
| `/preview_prod` | Deploy to production | #[[file:src/autonomy/deploy.ts]], #[[file:src/api/vercel-api.ts]] |
| `/vercel_setup` | Configure Vercel token | #[[file:src/handlers/command-handler.ts]], #[[file:docs/VERCEL_SETUP_GUIDE.md]] |

### VPS Service Commands (NEW)
| Command | Description | Source Files |
|---------|-------------|--------------|
| `/services` | List running pm2/docker services | #[[file:src/handlers/command-handler.ts]], #[[file:src/autonomy/smart-exec.ts]] |
| `/restart <name>` | Restart a service (pm2/docker) | #[[file:src/handlers/command-handler.ts]] |
| `/start <name>` | Start a service | #[[file:src/handlers/command-handler.ts]] |
| `/stop <name>` | Stop a service | #[[file:src/handlers/command-handler.ts]] |
| `/logs <name> [lines]` | View service logs | #[[file:src/handlers/command-handler.ts]] |
| `/deploy_update [service]` | Git pull + npm install + restart | #[[file:src/handlers/command-handler.ts]], #[[file:src/autonomy/git-operations.ts]] |

### CLI Execution Commands
| Command | Description | Source Files |
|---------|-------------|--------------|
| `/exec <cmd>` | Run single CLI command | #[[file:src/handlers/command-handler.ts]], #[[file:src/autonomy/smart-exec.ts]] |
| `/exec-sequence` | Run numbered command sequence | #[[file:src/handlers/command-handler.ts]], #[[file:src/autonomy/smart-exec.ts]] |
| `/exec-template` | Run predefined templates | #[[file:src/handlers/command-handler.ts]], #[[file:src/autonomy/smart-exec.ts]] |

### Context Budget Commands
| Command | Description | Source Files |
|---------|-------------|--------------|
| `/context` | View token usage & budget | #[[file:src/handlers/command-handler.ts]], #[[file:src/nova/context-budget.ts]] |
| `/context_reset` | Clear file read tracking | #[[file:src/handlers/command-handler.ts]], #[[file:src/nova/context-budget.ts]] |

### NOVA Agent Commands
| Command | Description | Source Files |
|---------|-------------|--------------|
| `/team` | Show NOVA agents | #[[file:src/handlers/command-handler.ts]], #[[file:src/nova/types.ts]] |
| `/activate <agent> <mission>` | Activate a NOVA agent | #[[file:src/handlers/command-handler.ts]], #[[file:src/orchestrator/orchestrator.ts]] |
| `/constellation` | Multi-agent activation | #[[file:src/handlers/command-handler.ts]] |
| `/handoff <agent>` | Transfer to another agent | #[[file:src/handlers/command-handler.ts]] |
| `/deactivate` | Deactivate current agent | #[[file:src/handlers/command-handler.ts]] |
| `/nova_memory` | Memory system stats | #[[file:src/handlers/command-handler.ts]], #[[file:src/db/nova-memory.ts]] |

### Job Queue Commands
| Command | Description | Source Files |
|---------|-------------|--------------|
| `/job <id>` | Check background job status | #[[file:src/handlers/command-handler.ts]], #[[file:src/db/job-queue.ts]] |
| `/jobs` | List recent background jobs | #[[file:src/handlers/command-handler.ts]], #[[file:src/db/job-queue.ts]] |
| `/cancel <id>` | Cancel pending job | #[[file:src/handlers/command-handler.ts]], #[[file:src/db/job-queue.ts]] |
| `/job_retry <id>` | Retry failed job | #[[file:src/handlers/command-handler.ts]], #[[file:src/db/job-queue.ts]] |

### Tutorial & Help
| Command | Description | Source Files |
|---------|-------------|--------------|
| `/tutorial` | Quick start guide | #[[file:src/handlers/tutorial-handler.ts]] |
| `/tutorial <topic>` | Detailed guide by topic | #[[file:src/handlers/tutorial-handler.ts]] |

---

## Key Architecture Files

For agents working on command enhancements:

- **Command Handler**: #[[file:src/handlers/command-handler.ts]] - Main command routing
- **Orchestrator**: #[[file:src/orchestrator/orchestrator.ts]] - Message flow & NOVA integration
- **Sessions DB**: #[[file:src/db/sessions.ts]] - Session management
- **Job Queue**: #[[file:src/db/job-queue.ts]] - Background job system
- **Context Budget**: #[[file:src/nova/context-budget.ts]] - Token tracking
- **Smart Exec**: #[[file:src/autonomy/smart-exec.ts]] - CLI command execution
- **Git Operations**: #[[file:src/autonomy/git-operations.ts]] - Git commands
- **Vercel API**: #[[file:src/api/vercel-api.ts]] - Deployment integration
- **GitHub API**: #[[file:src/autonomy/github.ts]] - GitHub operations
- **NOVA Types**: #[[file:src/nova/types.ts]] - Agent definitions

---

## Why These 20 in BotFather?

1. **help/status/reset** - Core session management
2. **clone/repos/repo** - Repository management with auto-pull
3. **gh_repos/gh_clone** - GitHub integration
4. **preview** - Vercel deployment
5. **services/restart/logs/deploy_update** - VPS management
6. **exec** - CLI command execution
7. **context** - Prevents timeout issues
8. **team/activate** - NOVA agent system
9. **job/jobs** - Background task monitoring
10. **tutorial** - Onboarding

---

## Setup Instructions

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/setcommands`
3. Select your bot
4. Paste the command list from above
5. Done! Users will see command suggestions when typing `/`
