# 📋 NOVA Command Reference v7.1
## Complete Working Commands Audit

**Research By**: 🔭 VEGA Ξ172167 & ⭐ POLARIS Ξ8890
**Date**: January 10, 2026
**Source**: `src/handlers/command-handler.ts` (4100+ lines)

---

## 🔑 Authentication & Configuration

### GitHub Token (CRITICAL - Often Missing from Docs)
```
/github_token                    # Show status & help
/github_token <token>            # Set token (auto-fetches identity)
/github_token identity <n> <e>   # Manual identity: name email
/github_token clear              # Remove token
/github_token default <on|off>   # Use server token
/github_token force <token>      # Set without validation
```

### Vercel Configuration (CRITICAL - Often Missing from Docs)
```
/vercel_setup                    # Show status
/vercel_setup <token>            # Set Vercel token
/vercel_setup clear              # Remove config
/vercel_setup project <name>     # Set project name
/vercel_setup org <team-id>      # Set team/org ID
/vercel_setup default <on|off>   # Use server token
```

### Surge Configuration
```
/surge_setup                     # Show status
/surge_setup <email> <token>     # Set credentials
/surge_setup clear               # Remove credentials
/surge_setup default <on|off>    # Use server credentials
```

---

## 📁 Codebase Management

### Repository Operations
```
/clone <repo-url>                # Clone repository
/init <name> [--github] [--priv] # Create new project
/repos                           # List repositories (numbered)
/repo <num>                      # Quick switch + auto-pull
/getcwd                          # Show working directory
/setcwd <path>                   # Set working directory
```

### Custom Commands
```
/command-set <name> <path> [txt] # Register command
/load-commands <folder>          # Load .md files as commands
/commands                        # List registered commands
/command-invoke <name> [args]    # Execute custom command
```

---

## 🤖 Session & Droid Configuration

### Session Management
```
/status                          # Full status overview
/reset                           # Clear session context
/new                             # Create new numbered chat
/chats                           # List all chats
/chat <name>                     # Switch/create named chat
```

### Droid Settings
```
/droid-model <model>             # glm-4.7, gpt-5.2, gemini-3-flash-preview
/droid-reasoning <level>         # off|low|medium|high
/droid-spec <on|off>             # Enable spec mode
/droid-spec-model <model>        # Set spec model
/droid-spec-reasoning <level>    # Set spec reasoning
/droid-auto <level>              # normal|low|medium|high
```

---

## 🚀 Deployment Commands

### Preview Deployments (Vercel Default)
```
/preview [dir]                   # Deploy local dir to Vercel
/preview owner/repo              # Deploy GitHub repo directly
/preview owner/repo#branch       # Deploy specific branch
/preview_prod [dir|repo]         # Deploy to production
/preview_scan                    # Scan for deployable folders
/preview_providers               # List all providers
```

### Vercel-Specific
```
/vercel [dir]                    # Deploy to preview
/vercel_prod [dir]               # Deploy to production
/vercel_status                   # Show Vercel config
/vercel_debug <on|off>           # Toggle debug mode
/vercel_env                      # List env vars
/vercel_env add KEY=value [type] # Add env var (build|runtime)
/vercel_env remove KEY [type]    # Remove env var
/vercel_env clear                # Clear all env vars
/vercel_archive <on|off>         # Archive mode for large projects
/vercel_regions <r1,r2>          # Set deployment regions
/vercel_regions clear            # Clear regions (auto-select)
```

---

## 🔧 Git Operations

### Basic Git
```
/git_status                      # Git status
/git_diff [staged]               # Show diff
/git_commit <message>            # Commit changes
/git_push [branch]               # Push to remote
/git_branch <name>               # Create/switch branch
/git_pull                        # Pull latest
/git_config <name> <email>       # Configure identity
```

### Autonomy Configuration
```
/autonomy                        # Show config
/autonomy level <lvl>            # off|low|medium|high|full
/autonomy git <on|off>           # Enable/disable git
/autonomy git-push <on|off>      # Enable/disable push
/autonomy preview <on|off>       # Enable/disable preview
/autonomy exec <on|off>          # Enable/disable exec
/autonomy exec-allow <cmd>       # Add to allowlist
/autonomy reset                  # Reset to defaults
```

---

## 🐙 GitHub API Commands

### Browse & Clone
```
/gh                              # GitHub commands help
/gh_user                         # Your GitHub profile
/gh_repos [limit]                # List your repositories
/gh_select <num>                 # Clone repo by number
/gh_clone <repo>                 # Clone by name or owner/repo
```

### Repository Management
```
/gh_repo <owner/repo>            # Get repo info
/gh_create <name> [--private]    # Create new repo
/gh_fork <owner/repo>            # Fork a repository
```

### Pull Requests
```
/gh_pr_create <title> [--base]   # Create pull request
/gh_prs [owner/repo]             # List pull requests
```

---

## ⚡ Command Execution

### Basic Execution
```
/exec <command>                  # Run single command
/exec-sequence <cmds>            # Run numbered sequence
/exec-template [name]            # Run/list templates
/exec-dry <cmds>                 # Validate without running
/autonomy-full                   # Enable full autonomy mode
```

---

## 🖥️ VPS Service Management

```
/services                        # List running services
/restart <name>                  # Restart service
/start <name>                    # Start service
/stop <name>                     # Stop service
/logs <name> [lines]             # View service logs
/deploy-update [service]         # Pull + restart
```

---

## ⭐ NOVA Constellation

### Agent Activation
```
/team                            # Show NOVA agents
/activate <agent> <mission>      # Activate agent
/handoff <agent> <context>       # Handoff to agent
/constellation <agents> <mission># Multi-agent mode
/deactivate                      # Deactivate agent
/templates                       # Show activation examples
```

### Cognitive Loop
```
/nova_loop                       # Show Cognitive Loop v2.0
/nova_checkpoint <summary>       # Save reasoning checkpoint
/nova_checkpoints                # View saved checkpoints
/nova_clear                      # Reset NOVA state
```

### Self-Healing Debug
```
/nova_debug                      # View debug memory stats
/nova_debug_clear                # Clear debug memory
```

### Memory System
```
/nova_memory                     # Memory system stats
/nova_memory_recent [agent]      # Recent memories
/nova_memory_patterns [agent]    # Learned patterns
/nova_memory_reflections         # Learning from failures
/nova_memory_add <a> <t> <action># Add memory manually
```

---

## 📊 Context Budget

```
/context                         # View token usage & budget
/context_reset                   # Clear file read tracking
```

---

## 📋 Async Job Queue

### Status & Monitoring
```
/job <id>                        # Check job status
/jobs                            # List recent jobs
/job_stats [hours]               # Queue statistics
/job_logs <id>                   # View job logs
```

### Queue Views
```
/job_pending [limit]             # List pending jobs
/job_running                     # List running jobs
/job_failed [limit]              # List failed jobs
```

### Job Control
```
/cancel <id>                     # Cancel pending job
/job_retry <id>                  # Retry failed job
/job_priority <id> <0-100>       # Change priority
```

### Maintenance
```
/job_cleanup [days]              # Remove old jobs
/job_help                        # Full job commands help
```

---

## 📚 Tutorial System

```
/tutorial                        # Quick start guide (English)
/tutorial es                     # Guía rápida (Español)
/tutorial [en|es] <topic>        # Detailed guide
```

**Topics**: setup, deploy, git, github, autonomy, nova, database, all

---

## 🔄 Command Aliases

The system normalizes underscores to hyphens, so these are equivalent:
- `/git_status` = `/git-status`
- `/github_token` = `/github-token`
- `/vercel_setup` = `/vercel-setup`
- etc.

---

## ⚠️ Commands NOT in /help but ARE Working

These commands exist in code but were missing from the `/help` output:

| Command | Purpose | Status |
|---------|---------|--------|
| `/github_token` | GitHub authentication | ✅ Working |
| `/vercel_setup` | Vercel configuration | ✅ Working |
| `/vercel_env` | Environment variables | ✅ Working |
| `/vercel_debug` | Debug mode toggle | ✅ Working |
| `/vercel_archive` | Archive mode | ✅ Working |
| `/vercel_regions` | Region selection | ✅ Working |
| `/gh_clone` | Clone by name | ✅ Working |
| `/gh_select` | Clone from list | ✅ Working |
| `/exec-sequence` | Multi-command exec | ✅ Working |
| `/exec-template` | Template execution | ✅ Working |
| `/exec-dry` | Dry run validation | ✅ Working |
| `/autonomy-full` | Full autonomy mode | ✅ Working |
| `/nova_memory_*` | Memory system | ✅ Working |
| `/context` | Context budget | ✅ Working |
| `/context_reset` | Reset tracking | ✅ Working |

---

## 📊 Command Count Summary

| Category | Count |
|----------|-------|
| Authentication | 11 |
| Codebase | 8 |
| Session/Droid | 11 |
| Deployment | 16 |
| Git | 8 |
| GitHub API | 10 |
| Execution | 5 |
| VPS Services | 6 |
| NOVA Constellation | 7 |
| NOVA Cognitive | 4 |
| NOVA Debug | 2 |
| NOVA Memory | 5 |
| Context Budget | 2 |
| Job Queue | 12 |
| Tutorial | 1 |
| **TOTAL** | **108** |

---

⭐ POLARIS Ξ8890 | 🔭 VEGA Ξ172167
