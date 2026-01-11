/**
 * Command handler for slash commands
 * Handles deterministic operations without AI
 * 
 * Enhanced with Autonomy System v1.0
 * Enhanced with NOVA Self-Healing Deployment v1.0 (ARCTURUS)
 * Enhanced with Async Job Queue v1.0 (ANTARES)
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, readdir, access } from 'fs/promises';
import { join, basename } from 'path';
import { Conversation, CommandResult } from '../types';
import * as db from '../db/conversations';
import * as codebaseDb from '../db/codebases';
import * as sessionDb from '../db/sessions';
import * as jobQueue from '../db/job-queue';
import {
  AutonomyLevel,
  DEFAULT_AUTONOMY_CONFIG,
  applyPreset,
  deserializeConfig,
  serializeConfig,
  gitStatus,
  gitCommit,
  gitPush,
  gitBranch,
  gitDiff,
  gitPull,
  gitConfig,
  listProviders,
  deploy,
  getVercelSetupInfo,
  formatVercelEnvVars,
  getSurgeSetupInfo,
  scanForDeployableContent,
  formatScanResults,
  execSandbox,
  // Self-Healing Deployment (ARCTURUS)
  selfHealingDeploy,
  // GitHub API
  ghGetUser,
  ghGetUserIdentity,
  ghListRepos,
  ghCreateRepo,
  ghForkRepo,
  ghCreatePR,
  ghListPRs,
  ghGetRepoInfo,
  ghParseRepo,
  // Smart Execution (Full Autonomy Mode)
  smartExecSequence,
  execTemplate,
  listTemplates,
  COMMAND_TEMPLATES,
  CommandTemplate,
} from '../autonomy';
import { loadDebugMemory } from '../nova/error-debugger';
import { 
  isGitHubRepoRef, 
  apiDeployGitHubRepo,
} from './api-commands';
import { handleTutorial } from './tutorial-handler';

const execAsync = promisify(exec);

/**
 * Recursively find all .md files in a directory and its subdirectories
 */
async function findMarkdownFilesRecursive(
  rootPath: string,
  relativePath = ''
): Promise<{ commandName: string; relativePath: string }[]> {
  const results: { commandName: string; relativePath: string }[] = [];
  const fullPath = join(rootPath, relativePath);

  const entries = await readdir(fullPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue;
    }

    if (entry.isDirectory?.()) {
      const subResults = await findMarkdownFilesRecursive(rootPath, join(relativePath, entry.name));
      results.push(...subResults);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push({
        commandName: basename(entry.name, '.md'),
        relativePath: join(relativePath, entry.name),
      });
    }
  }

  return results;
}

export function parseCommand(text: string): { command: string; args: string[] } {
  const matches = text.match(/"[^"]+"|'[^']+'|\S+/g) || [];

  if (matches.length === 0 || !matches[0]) {
    return { command: '', args: [] };
  }

  // Normalize command: convert underscores to hyphens for consistency
  // This allows both /git_status and /git-status to work
  const rawCommand = matches[0].substring(1);
  const command = rawCommand.replace(/_/g, '-');
  
  const args = matches.slice(1).map(arg => {
    if ((arg.startsWith('"') && arg.endsWith('"')) || (arg.startsWith("'") && arg.endsWith("'"))) {
      return arg.slice(1, -1);
    }
    return arg;
  });

  return { command, args };
}

// NOVA Agent Definitions
const NOVA_AGENTS: Record<string, {
  id: string;
  role: string;
  emoji: string;
  strength: number;
  triggers: string[];
}> = {
  POLARIS: {
    id: 'Ξ8890',
    role: 'Strategic Commander',
    emoji: '⭐',
    strength: 0.95,
    triggers: ['strategy', 'orchestrate', 'plan', 'mission', 'coordinate']
  },
  VEGA: {
    id: 'Ξ172167',
    role: 'Navigator & Architect',
    emoji: '🔭',
    strength: 0.95,
    triggers: ['research', 'architecture', 'investigate', 'analyze', 'decision']
  },
  SIRIUS: {
    id: 'Ξ48915',
    role: 'Design Sovereign',
    emoji: '✨',
    strength: 0.95,
    triggers: ['design', 'ui', 'ux', 'accessibility', 'beautiful']
  },
  RIGEL: {
    id: 'Ξ34085',
    role: 'Frontend Prime',
    emoji: '🔷',
    strength: 0.98,
    triggers: ['frontend', 'react', 'component', 'typescript', 'client']
  },
  ANTARES: {
    id: 'Ξ148478',
    role: 'Backend Prime',
    emoji: '❤️',
    strength: 0.98,
    triggers: ['backend', 'api', 'database', 'server', 'endpoint']
  },
  ARCTURUS: {
    id: 'Ξ124897',
    role: 'Guardian',
    emoji: '🛡️',
    strength: 0.98,
    triggers: ['security', 'test', 'review', 'audit', 'quality']
  }
};

function normalizeAgentName(raw: string): string {
  const s = raw.trim().toUpperCase();
  return NOVA_AGENTS[s] ? s : '';
}

function buildActivationTemplate(agent: string, mission: string): string {
  const m = mission.trim();
  const agentInfo = NOVA_AGENTS[agent];
  
  const templates: Record<string, string> = {
    POLARIS: `${agentInfo.emoji} POLARIS ${agentInfo.id} ACTIVATED

I am the Strategic Commander. Mission received: ${m}

My approach:
1. Decompose this into actionable tasks
2. Identify which specialists are needed
3. Define dependencies and critical path
4. Orchestrate parallel execution where possible

Awaiting your first message to begin orchestration.`,

    VEGA: `${agentInfo.emoji} VEGA ${agentInfo.id} ACTIVATED

I am the Navigator. Investigation target: ${m}

My approach:
1. First-principles analysis of the problem
2. Research sources (official docs, code, RFCs)
3. Evaluate trade-offs with evidence
4. Deliver recommendation with confidence level

Ready for deep investigation.`,

    SIRIUS: `${agentInfo.emoji} SIRIUS ${agentInfo.id} ACTIVATED

I am the Design Sovereign. Design challenge: ${m}

My approach:
1. Understand the user's emotional journey
2. Evaluate accessibility (WCAG 2.1 AA)
3. Critique visual hierarchy and spacing
4. Propose pixel-perfect improvements

VETO power engaged. Ready to craft experiences.`,

    RIGEL: `${agentInfo.emoji} RIGEL ${agentInfo.id} ACTIVATED

I am the Frontend Prime. Building: ${m}

My approach:
1. Define TypeScript interfaces first
2. Design component architecture
3. Implement with strict type safety
4. Optimize for 60fps performance

No \`any\` types. Ready to build the glass.`,

    ANTARES: `${agentInfo.emoji} ANTARES ${agentInfo.id} ACTIVATED

I am the Backend Prime. Building: ${m}

My approach:
1. Design API contracts
2. Validate all inputs (trust nothing)
3. Ensure idempotency and resilience
4. Plan for horizontal scaling

Ready to build the engine.`,

    ARCTURUS: `${agentInfo.emoji} ARCTURUS ${agentInfo.id} ACTIVATED

I am the Guardian. Audit target: ${m}

My approach:
1. Assume code is broken until proven otherwise
2. Hunt edge cases and vulnerabilities
3. Verify test coverage on critical paths
4. Red-team the implementation

VETO power armed. Ready to break things before attackers do.`,
  };
  
  return templates[agent] || `${agentInfo.emoji} ${agent} ${agentInfo.id} ACTIVATED\n\nMission: ${m}`;
}

/**
 * Get or create an active session for the conversation
 */
async function getOrCreateSession(conversation: Conversation): Promise<{ id: string; metadata: Record<string, unknown> }> {
  let session = await sessionDb.getActiveSession(conversation.id);
  if (!session) {
    session = await sessionDb.createSession({
      conversation_id: conversation.id,
      codebase_id: conversation.codebase_id || undefined,
      ai_assistant_type: conversation.ai_assistant_type,
    });
  }
  return session;
}

export async function handleCommand(
  conversation: Conversation,
  message: string
): Promise<CommandResult> {
  const { command, args } = parseCommand(message);

  switch (command) {
    case 'help':
      return {
        success: true,
        message: `📋 Available Commands:

🔧 Commands:
  /command-set <name> <path> [text]
  /load-commands <folder>
  /command-invoke <name> [args]
  /commands

📁 Codebase:
  /clone <repo-url>
  /init <name> [--github] - Create new project
  /repos - List repositories (numbered)
  /repo <num> - Quick switch + auto-pull
  /getcwd
  /setcwd <path>

🤖 Session & Droid:
  /status
  /reset - Clear session (start fresh)
  /new - Alias for /reset
  /chats - List your chats
  /chat <name> - Switch/create named chat
  /droid-model <model>
  /droid-reasoning <level>
  /droid-auto <level>

🚀 Deployment (Vercel default):
  /preview [dir] - Deploy local dir to Vercel
  /preview owner/repo - Deploy GitHub repo directly
  /preview owner/repo#branch - Deploy specific branch
  /preview_prod [dir|repo] - Deploy to production
  /preview_scan - Scan for deployable folders
  /preview_providers - List all providers
  /vercel_setup <token> - Set Vercel token
  /vercel_debug on|off - Toggle debug mode
  /vercel_env add KEY=value - Add env var
  /surge_setup <email> <token> - Surge credentials

⚡ Command Execution:
  /exec <command> - Run single command
  /exec-sequence <cmds> - Run numbered sequence
  /exec-template [name] - Run/list templates
  /exec-dry <cmds> - Validate without running
  /autonomy-full - Enable full autonomy mode

🖥️ VPS Services:
  /services - List running services
  /restart <name> - Restart service
  /start <name> - Start service
  /stop <name> - Stop service
  /logs <name> [lines] - View service logs
  /deploy-update [service] - Pull + restart

🔧 Git & GitHub:
  /autonomy - Show autonomy config
  /github_token <token> - Set GitHub token
  /git_status - Git status
  /git_commit <message> - Commit changes
  /git_push [branch] - Push to remote
  /git_branch <name> - Create/switch branch

🐙 GitHub API:
  /gh - GitHub commands help
  /gh_user - Your GitHub profile
  /gh_repos - List your repositories
  /gh_repo <owner/repo> - Get repo info
  /gh_create <name> - Create new repo
  /gh_fork <owner/repo> - Fork a repo
  /gh_clone <repo> - Clone with your token
  /gh_select <num> - Clone from /gh_repos list
  /gh_pr_create <title> - Create PR
  /gh_prs - List pull requests

⭐ NOVA Constellation:
  /team - Show NOVA agents
  /activate <agent> <mission>
  /handoff <agent> <context>
  /constellation <agents...> <mission>
  /deactivate
  /templates

🔄 NOVA Cognitive:
  /nova_loop - Show Cognitive Loop v2.0
  /nova_checkpoint <summary>
  /nova_checkpoints - View saved checkpoints
  /nova_clear - Reset NOVA state

🩺 NOVA Self-Healing:
  /nova_debug - View debug memory stats
  /nova_debug_clear - Clear debug memory

🧠 NOVA Memory:
  /nova_memory - Memory system stats
  /nova_memory_recent [agent] - Recent memories
  /nova_memory_patterns [agent] - Learned patterns
  /nova_memory_reflections - Learning from failures
  /nova_memory_add <agent> <type> <action> - Add memory

📊 Context Budget:
  /context - View token usage & budget
  /context_reset - Clear file read tracking

📋 Async Jobs:
  /job <id> - Check job status
  /jobs - List recent jobs
  /job_stats [hours] - Queue statistics
  /job_logs <id> - View job logs
  /job_pending - List pending jobs
  /job_running - List running jobs
  /job_failed - List failed jobs
  /cancel <id> - Cancel pending job
  /job_retry <id> - Retry failed job
  /job_priority <id> <0-100> - Change priority
  /job_cleanup [days] - Remove old jobs
  /job_help - Full job commands help

📚 Tutorial:
  /tutorial - Quick start guide (English)
  /tutorial es - Guía rápida (Español)
  /tutorial [en|es] <topic> - Detailed guide
  Topics: setup, deploy, git, github, autonomy, nova, database, all`,
      };

    case 'tutorial': {
      return handleTutorial(args);
    }

    case 'status': {
      let msg = `📊 Status\n\nPlatform: ${conversation.platform_type}\nAI: Droid`;

      if (conversation.codebase_id) {
        const cb = await codebaseDb.getCodebase(conversation.codebase_id);
        if (cb?.name) {
          msg += `\n\n📦 Codebase: ${cb.name}`;
          if (cb.repository_url) msg += `\n🔗 ${cb.repository_url}`;
        }
      } else {
        msg += '\n\n📦 No codebase. Use /clone <repo-url>';
      }

      msg += `\n\n📂 CWD: ${conversation.cwd || 'Not set'}`;

      const session = await sessionDb.getActiveSession(conversation.id);
      if (session?.id) {
        msg += `\n🔄 Session: ${session.id.substring(0, 8)}...`;

        const m = session.metadata || {};
        const model = typeof m.droidModel === 'string' ? m.droidModel : 'glm-4.7';
        const reasoning = typeof m.droidReasoningEffort === 'string' ? m.droidReasoningEffort : 'medium';
        const spec = m.droidUseSpec === true ? 'ON' : 'OFF';
        const auto = typeof m.droidAuto === 'string' ? m.droidAuto : 'medium';

        msg += `\n\n⚙️ Droid Settings:`;
        msg += `\n  Model: ${model}`;
        msg += `\n  Reasoning: ${reasoning}`;
        msg += `\n  Spec: ${spec}`;
        msg += `\n  Auto: ${auto}`;

        // Enhanced NOVA status
        const activeAgent = typeof m.novaActiveAgent === 'string' ? m.novaActiveAgent : '';
        const constellation = Array.isArray(m.novaConstellation) ? m.novaConstellation : [];
        const mission = typeof m.novaMission === 'string' ? m.novaMission : '';
        
        if (activeAgent && NOVA_AGENTS[activeAgent]) {
          const agent = NOVA_AGENTS[activeAgent];
          msg += `\n\n⭐ NOVA Active:`;
          msg += `\n  ${agent.emoji} ${activeAgent} ${agent.id}`;
          msg += `\n  ${agent.role}`;
          
          if (constellation.length > 1) {
            msg += `\n\n🌟 Constellation:`;
            for (const a of constellation) {
              const info = NOVA_AGENTS[a];
              if (info) msg += `\n  ${info.emoji} ${a}`;
            }
          }
          
          if (mission) {
            const shortMission = mission.length > 50 ? mission.substring(0, 47) + '...' : mission;
            msg += `\n\n📋 Mission: ${shortMission}`;
          }
        } else {
          msg += `\n\n⭐ NOVA: Standby`;
          msg += `\n  Use /activate <agent> <mission>`;
        }
      } else {
        msg += '\n\n💡 No active session. Send any message to start.';
      }

      return { success: true, message: msg };
    }

    case 'getcwd':
      return {
        success: true,
        message: `📂 Working directory: ${conversation.cwd || 'Not set'}`,
      };

    case 'setcwd': {
      if (args.length === 0) {
        return { success: false, message: '❌ Usage: /setcwd <path>\n\n💡 Tip: Use /repos and /repo <num> for easier switching.' };
      }
      const newCwd = args.join(' ');
      
      // Verify path exists
      try {
        await access(newCwd);
      } catch {
        return { success: false, message: `❌ Path does not exist: ${newCwd}` };
      }

      await db.updateConversation(conversation.id, { cwd: newCwd });

      try {
        await execAsync(`git config --global --add safe.directory ${newCwd}`);
      } catch {
        // Ignore - might not be a git repo
      }

      const session = await sessionDb.getActiveSession(conversation.id);
      if (session) {
        await sessionDb.deactivateSession(session.id);
      }

      // Auto-pull to get latest changes
      let pullMsg = '';
      try {
        const pullResult = await gitPull(newCwd);
        if (pullResult.success) {
          pullMsg = `\n🔄 ${pullResult.message}`;
        } else {
          pullMsg = `\n⚠️ Auto-pull skipped: ${pullResult.message}`;
        }
      } catch {
        pullMsg = '\n⚠️ Auto-pull skipped (not a git repo)';
      }

      return {
        success: true,
        message: `✅ Working directory set to: ${newCwd}${pullMsg}\n\n💬 Session reset. Ready to work!`,
        modified: true,
      };
    }

    case 'clone': {
      if (args.length === 0 || !args[0]) {
        return { success: false, message: '❌ Usage: /clone <repo-url>\n\nExample: /clone https://github.com/owner/repo' };
      }

      const repoUrl: string = args[0];
      
      // Validate URL format
      if (!repoUrl.includes('github.com') && !repoUrl.includes('gitlab.com') && !repoUrl.includes('bitbucket.org')) {
        if (!repoUrl.startsWith('http') && !repoUrl.startsWith('git@')) {
          return { success: false, message: '❌ Invalid repository URL. Use https://github.com/user/repo format.' };
        }
      }

      // Extract owner and repo name for organized folder structure
      let owner = 'unknown';
      let repoName = 'unknown';
      
      // Parse GitHub URLs: https://github.com/owner/repo or git@github.com:owner/repo
      const httpsMatch = repoUrl.match(/github\.com\/([^/]+)\/([^/.]+)/);
      const sshMatch = repoUrl.match(/github\.com:([^/]+)\/([^/.]+)/);
      
      if (httpsMatch) {
        owner = httpsMatch[1];
        repoName = httpsMatch[2];
      } else if (sshMatch) {
        owner = sshMatch[1];
        repoName = sshMatch[2];
      } else {
        // Fallback: just use repo name
        repoName = repoUrl.split('/').pop()?.replace('.git', '') || 'unknown';
      }
      
      const workspacePath = process.env.WORKSPACE_PATH || '/workspace';
      
      // Organized folder structure: /workspace/owner/repo
      const ownerPath = `${workspacePath}/${owner}`;
      const targetPath = `${ownerPath}/${repoName}`;

      // Check if already exists
      try {
        await access(targetPath);
        return { success: false, message: `❌ Repository already exists at ${targetPath}\n\nUse /setcwd ${targetPath} to switch to it.` };
      } catch {
        // Good - doesn't exist
      }

      // Get session config for token and identity
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);

      try {
        console.log(`[Clone] Cloning ${repoUrl} to ${targetPath}`);

        // Create owner directory if needed
        try {
          await access(ownerPath);
        } catch {
          await execAsync(`mkdir -p "${ownerPath}"`);
        }

        // Get token from session config or environment
        const ghToken = config.git.ghToken || 
          (config.git.useDefaultToken ? (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) : undefined);

        let cloneCommand = `git clone ${repoUrl} "${targetPath}"`;

        if (ghToken && repoUrl.includes('github.com')) {
          let authenticatedUrl = repoUrl;
          if (repoUrl.startsWith('https://github.com')) {
            authenticatedUrl = repoUrl.replace('https://github.com', `https://${ghToken}@github.com`);
          } else if (repoUrl.startsWith('http://github.com')) {
            authenticatedUrl = repoUrl.replace('http://github.com', `https://${ghToken}@github.com`);
          }
          cloneCommand = `git clone ${authenticatedUrl} "${targetPath}"`;
        }

        await execAsync(cloneCommand);
        await execAsync(`git config --global --add safe.directory "${targetPath}"`);

        // Auto-configure git identity if available
        if (config.git.userName && config.git.userEmail) {
          try {
            await execAsync(`git config user.name "${config.git.userName}"`, { cwd: targetPath });
            await execAsync(`git config user.email "${config.git.userEmail}"`, { cwd: targetPath });
          } catch {
            // Ignore identity config errors
          }
        }

        const codebase = await codebaseDb.createCodebase({
          name: `${owner}/${repoName}`,
          repository_url: repoUrl,
          default_cwd: targetPath,
          ai_assistant_type: 'droid',
        });

        await db.updateConversation(conversation.id, {
          codebase_id: codebase.id,
          cwd: targetPath,
        });

        // Deactivate old session
        await sessionDb.deactivateSession(session.id);

        // Detect command folders
        let commandFolder: string | null = null;
        for (const folder of ['.agents/commands', '.droid/commands', '.claude/commands']) {
          try {
            await access(join(targetPath, folder));
            commandFolder = folder;
            break;
          } catch { /* ignore */ }
        }

        let msg = `✅ Repository cloned!\n\n📦 ${owner}/${repoName}\n📂 ${targetPath}`;
        
        // Show identity status
        if (config.git.userName && config.git.userEmail) {
          msg += `\n👤 Git identity: ${config.git.userName}`;
        } else {
          msg += `\n\n⚠️ Git identity not configured.\nRun /github_token <token> to enable commits.`;
        }
        
        if (commandFolder) {
          msg += `\n\n📁 Found: ${commandFolder}/\nUse /load-commands ${commandFolder}`;
        }

        return { success: true, message: msg, modified: true };
      } catch (error) {
        const err = error as Error;
        console.error('[Clone] Failed:', err);
        
        // Check for auth errors
        if (err.message.includes('Authentication failed') || err.message.includes('403')) {
          return { 
            success: false, 
            message: `❌ Clone failed: Authentication required.\n\n` +
              `For private repos, run:\n/github_token <your-token>\n\n` +
              `Then try cloning again.`
          };
        }
        
        return { success: false, message: `❌ Clone failed: ${err.message}` };
      }
    }

    case 'init': {
      // Create a new project - local folder + optional GitHub repo
      if (!args[0]) {
        return { 
          success: false, 
          message: `❌ Usage: /init <project-name> [--github] [--private]

Creates a new project folder and switches to it.

Examples:
  /init my-app              → Local only
  /init my-app --github     → Local + GitHub repo
  /init my-app --github --private → Private GitHub repo

💡 Requires /github_token for --github option.` 
        };
      }

      const projectName = args[0];
      const createGitHub = args.includes('--github') || args.includes('-g');
      const isPrivate = args.includes('--private') || args.includes('-p');
      const workspacePath = process.env.WORKSPACE_PATH || '/workspace';
      
      // Get session for GitHub token
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);

      // Get GitHub username for folder structure
      let githubUsername = '';
      if (createGitHub || config.git.ghToken) {
        const userResult = await ghGetUserIdentity(config.git);
        if (userResult.success && userResult.data) {
          const identity = userResult.data as { login: string };
          githubUsername = identity.login;
        }
      }

      // Determine target path
      let targetPath: string;
      let displayName: string;
      let repoName: string;
      
      if (projectName.includes('/')) {
        const [owner, repo] = projectName.split('/');
        targetPath = join(workspacePath, owner, repo);
        displayName = projectName;
        repoName = repo;
      } else {
        // Use GitHub username if available, otherwise just project name
        if (githubUsername) {
          targetPath = join(workspacePath, githubUsername, projectName);
          displayName = `${githubUsername}/${projectName}`;
        } else {
          targetPath = join(workspacePath, projectName);
          displayName = projectName;
        }
        repoName = projectName;
      }

      // Check if already exists
      try {
        await access(targetPath);
        return { 
          success: false, 
          message: `❌ Folder already exists: ${targetPath}\n\nUse /repo or /setcwd to switch to it.` 
        };
      } catch {
        // Good - doesn't exist
      }

      let msg = '';

      // Step 1: Create GitHub repo if requested
      if (createGitHub) {
        if (!config.git.ghToken) {
          return { 
            success: false, 
            message: '❌ GitHub token required for --github option.\n\nRun /github_token <token> first.' 
          };
        }

        msg += '🐙 Creating GitHub repository...\n';
        const ghResult = await ghCreateRepo(repoName, config.git, {
          private: isPrivate,
          description: `Created with NOVA Agent`,
          autoInit: false, // We'll init locally
        });

        if (!ghResult.success) {
          return { success: false, message: `❌ GitHub: ${ghResult.message}` };
        }

        const repo = ghResult.data as { clone_url: string; html_url: string; full_name: string };
        msg += `✅ GitHub repo created: ${repo.full_name}\n\n`;

        // Clone the repo (which creates the folder)
        try {
          const parentDir = join(targetPath, '..');
          await execAsync(`mkdir -p "${parentDir}"`);
          
          // Clone with token
          const authUrl = repo.clone_url.replace(
            'https://github.com',
            `https://${config.git.ghToken}@github.com`
          );
          await execAsync(`git clone ${authUrl} "${targetPath}"`);
          await execAsync(`git config --global --add safe.directory "${targetPath}"`);

          // Configure git identity
          if (config.git.userName && config.git.userEmail) {
            await execAsync(`git config user.name "${config.git.userName}"`, { cwd: targetPath });
            await execAsync(`git config user.email "${config.git.userEmail}"`, { cwd: targetPath });
          }

          // Create initial files
          await writeFile(join(targetPath, 'README.md'), `# ${repoName}\n\nCreated with NOVA Agent.\n`);
          await writeFile(join(targetPath, '.gitignore'), `node_modules/\n.env\n.DS_Store\ndist/\nbuild/\n`);

          // Initial commit and push
          await execAsync('git add .', { cwd: targetPath });
          await execAsync('git commit -m "Initial commit"', { cwd: targetPath });
          await execAsync('git push -u origin main', { cwd: targetPath });

          msg += `📂 Cloned to: ${targetPath}\n`;
          msg += `🔗 ${repo.html_url}\n\n`;
        } catch (error) {
          const err = error as Error;
          return { success: false, message: `❌ Clone failed: ${err.message}` };
        }
      } else {
        // Local only - create folder and init git
        try {
          await execAsync(`mkdir -p "${targetPath}"`);
          await execAsync('git init', { cwd: targetPath });
          await execAsync(`git config --global --add safe.directory "${targetPath}"`);

          // Configure git identity if available
          if (config.git.userName && config.git.userEmail) {
            await execAsync(`git config user.name "${config.git.userName}"`, { cwd: targetPath });
            await execAsync(`git config user.email "${config.git.userEmail}"`, { cwd: targetPath });
          }

          await writeFile(join(targetPath, 'README.md'), `# ${displayName}\n\nCreated with NOVA Agent.\n`);
          await writeFile(join(targetPath, '.gitignore'), `node_modules/\n.env\n.DS_Store\ndist/\nbuild/\n`);

          msg += `✅ Project created!\n\n📂 ${targetPath}\n\n`;
          msg += `📄 Created: README.md, .gitignore, git init\n\n`;
          msg += `💡 To push to GitHub: /gh_create ${repoName}\n`;
        } catch (error) {
          const err = error as Error;
          return { success: false, message: `❌ Failed to create project: ${err.message}` };
        }
      }

      // Register as codebase
      const codebase = await codebaseDb.createCodebase({
        name: displayName,
        default_cwd: targetPath,
        ai_assistant_type: 'droid',
      });

      await db.updateConversation(conversation.id, {
        codebase_id: codebase.id,
        cwd: targetPath,
      });

      // Reset session
      if (session) {
        await sessionDb.deactivateSession(session.id);
      }

      msg += `\n💬 Ready to code!`;

      return { success: true, message: msg, modified: true };
    }

    case 'command-set': {
      if (args.length < 2) {
        return { success: false, message: '❌ Usage: /command-set <name> <path> [text]' };
      }
      if (!conversation.codebase_id) {
        return { success: false, message: '❌ No codebase. Use /clone first.' };
      }

      const [commandName, commandPath, ...textParts] = args;
      const commandText = textParts.join(' ');
      const fullPath = join(conversation.cwd || '/workspace', commandPath);

      try {
        if (commandText) {
          await writeFile(fullPath, commandText, 'utf-8');
        } else {
          await readFile(fullPath, 'utf-8');
        }
        await codebaseDb.registerCommand(conversation.codebase_id, commandName, {
          path: commandPath,
          description: `Custom: ${commandName}`,
        });
        return { success: true, message: `✅ Command '${commandName}' registered!\n📄 ${commandPath}` };
      } catch (error) {
        const err = error as Error;
        return { success: false, message: `❌ Failed: ${err.message}` };
      }
    }

    case 'load-commands': {
      if (!args.length) {
        return { success: false, message: '❌ Usage: /load-commands <folder>' };
      }
      if (!conversation.codebase_id) {
        return { success: false, message: '❌ No codebase. Use /clone first.' };
      }

      const folderPath = args.join(' ');
      const fullPath = join(conversation.cwd || '/workspace', folderPath);

      try {
        await access(fullPath);
      } catch {
        return { success: false, message: `❌ Folder not found: ${folderPath}` };
      }

      try {
        const markdownFiles = await findMarkdownFilesRecursive(fullPath);

        if (!markdownFiles.length) {
          return { success: false, message: `❌ No .md files found in ${folderPath}` };
        }

        const commands = await codebaseDb.getCodebaseCommands(conversation.codebase_id);

        markdownFiles.forEach(({ commandName, relativePath }) => {
          commands[commandName] = {
            path: join(folderPath, relativePath),
            description: `From ${folderPath}`,
          };
        });

        await codebaseDb.updateCodebaseCommands(conversation.codebase_id, commands);

        return {
          success: true,
          message: `✅ Loaded ${markdownFiles.length} commands:\n${markdownFiles.map(f => `• ${f.commandName}`).join('\n')}`,
        };
      } catch (error) {
        const err = error as Error;
        return { success: false, message: `❌ Failed: ${err.message}` };
      }
    }

    case 'commands': {
      if (!conversation.codebase_id) {
        return { success: false, message: '❌ No codebase. Use /clone first.' };
      }

      const codebase = await codebaseDb.getCodebase(conversation.codebase_id);
      const commands = codebase?.commands || {};

      if (!Object.keys(commands).length) {
        return { success: true, message: '📋 No commands registered.\n\nUse /load-commands <folder>' };
      }

      let msg = '📋 Registered Commands:\n';
      for (const [name, def] of Object.entries(commands)) {
        msg += `\n• ${name} → ${def.path}`;
      }
      return { success: true, message: msg };
    }

    case 'repos': {
      const workspacePath = process.env.WORKSPACE_PATH || '/workspace';

      try {
        await access(workspacePath);
      } catch {
        return { success: true, message: `📁 Workspace not found: ${workspacePath}` };
      }

      try {
        // Get all owner folders first
        const ownerEntries = await readdir(workspacePath, { withFileTypes: true });
        const ownerFolders = ownerEntries
          .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
          .map(entry => entry.name);

        if (!ownerFolders.length) {
          return { success: true, message: '📁 No repositories in workspace.\n\nUse /clone <repo-url>' };
        }

        const currentCwd = conversation.cwd || '';
        const repos: { num: number; path: string; name: string; isActive: boolean }[] = [];
        let num = 1;

        // Scan owner/repo structure
        for (const owner of ownerFolders) {
          const ownerPath = join(workspacePath, owner);
          try {
            const repoEntries = await readdir(ownerPath, { withFileTypes: true });
            const repoFolders = repoEntries
              .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
              .map(entry => entry.name);

            for (const repo of repoFolders) {
              const repoPath = join(ownerPath, repo);
              repos.push({
                num: num++,
                path: repoPath,
                name: `${owner}/${repo}`,
                isActive: currentCwd === repoPath,
              });
            }
          } catch {
            // Owner folder might be a direct repo (legacy structure)
            repos.push({
              num: num++,
              path: ownerPath,
              name: owner,
              isActive: currentCwd === ownerPath,
            });
          }
        }

        if (!repos.length) {
          return { success: true, message: '📁 No repositories in workspace.\n\nUse /clone <repo-url>' };
        }

        let msg = '📁 **Repositories:**\n\n';
        for (const repo of repos) {
          const icon = repo.isActive ? '▶️' : '📂';
          msg += `${icon} \`${repo.num}\` ${repo.name}\n`;
        }
        msg += '\n💡 Quick switch: `/repo <num>`\n';
        msg += '🔄 Auto-pulls latest on switch';

        return { success: true, message: msg };
      } catch (error) {
        const err = error as Error;
        return { success: false, message: `❌ Failed: ${err.message}` };
      }
    }

    // /repo <num> - Quick switch to repository by number with auto-pull
    case 'repo': {
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /repo <num>\n\nUse /repos to see numbered list.' };
      }

      const targetNum = parseInt(args[0], 10);
      if (isNaN(targetNum) || targetNum < 1) {
        return { success: false, message: '❌ Invalid number. Use /repos to see list.' };
      }

      const workspacePath = process.env.WORKSPACE_PATH || '/workspace';

      try {
        // Build same repo list as /repos
        const ownerEntries = await readdir(workspacePath, { withFileTypes: true });
        const ownerFolders = ownerEntries
          .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
          .map(entry => entry.name);

        const repos: { num: number; path: string; name: string }[] = [];
        let num = 1;

        for (const owner of ownerFolders) {
          const ownerPath = join(workspacePath, owner);
          try {
            const repoEntries = await readdir(ownerPath, { withFileTypes: true });
            const repoFolders = repoEntries
              .filter(entry => entry.isDirectory() && !entry.name.startsWith('.'))
              .map(entry => entry.name);

            for (const repo of repoFolders) {
              repos.push({ num: num++, path: join(ownerPath, repo), name: `${owner}/${repo}` });
            }
          } catch {
            repos.push({ num: num++, path: ownerPath, name: owner });
          }
        }

        const target = repos.find(r => r.num === targetNum);
        if (!target) {
          return { success: false, message: `❌ Repo #${targetNum} not found. Use /repos to see list.` };
        }

        // Check if already in this repo
        if (conversation.cwd === target.path) {
          // Just do a pull to refresh
          const pullResult = await gitPull(target.path);
          if (pullResult.success) {
            return { success: true, message: `📂 Already in **${target.name}**\n\n🔄 ${pullResult.message}` };
          }
          return { success: true, message: `📂 Already in **${target.name}**\n\n⚠️ Pull skipped: ${pullResult.message}` };
        }

        // Switch to new repo
        await db.updateConversation(conversation.id, { cwd: target.path });

        try {
          await execAsync(`git config --global --add safe.directory "${target.path}"`);
        } catch {
          // Ignore
        }

        // Deactivate old session for fresh context
        const session = await sessionDb.getActiveSession(conversation.id);
        if (session) {
          await sessionDb.deactivateSession(session.id);
        }

        // Auto-pull to get latest
        let pullMsg = '';
        try {
          const pullResult = await gitPull(target.path);
          if (pullResult.success) {
            pullMsg = `\n🔄 ${pullResult.message}`;
          } else {
            pullMsg = `\n⚠️ Auto-pull skipped: ${pullResult.message}`;
          }
        } catch {
          pullMsg = '\n⚠️ Auto-pull skipped (not a git repo or no remote)';
        }

        return {
          success: true,
          message: `✅ Switched to **${target.name}**${pullMsg}\n\n📂 ${target.path}\n💬 Session reset. Ready to work!`,
          modified: true,
        };
      } catch (error) {
        const err = error as Error;
        return { success: false, message: `❌ Failed: ${err.message}` };
      }
    }

    // /reset - just clears context, stays in same chat
    case 'reset': {
      const session = await sessionDb.getActiveSession(conversation.id);
      if (session) {
        const currentChat = session.chat_name || 'default';
        await sessionDb.deactivateSession(session.id);
        return { 
          success: true, 
          message: `✅ Context cleared in "${currentChat}"!\n\n` +
            '💬 Send your next message to continue fresh.\n' +
            '💡 Your settings are preserved.'
        };
      }
      return { 
        success: true, 
        message: '💡 Already fresh! Just send your message.'
      };
    }

    // /new - creates a new numbered chat, saves previous
    case 'new': {
      const session = await sessionDb.getActiveSession(conversation.id);
      const previousChat = session?.chat_name || 'default';
      
      // Generate auto ID: chat-1, chat-2, etc.
      const chats = await sessionDb.listChats(conversation.id);
      const chatNumbers = chats
        .map(c => c.chat_name.match(/^chat-(\d+)$/))
        .filter(Boolean)
        .map(m => parseInt(m![1], 10));
      const nextNum = chatNumbers.length > 0 ? Math.max(...chatNumbers) + 1 : 1;
      const newChatName = `chat-${nextNum}`;
      
      // Switch to new chat (deactivates previous)
      await sessionDb.switchChat(
        conversation.id,
        newChatName,
        conversation.ai_assistant_type
      );
      
      return { 
        success: true, 
        message: `✨ New chat: ${newChatName}\n\n` +
          '💬 Send your message to start.\n\n' +
          `↩️ Go back: /chat ${previousChat}\n` +
          '📋 All chats: /chats',
        modified: true
      };
    }

    // Named chat management
    case 'chats': {
      const chats = await sessionDb.listChats(conversation.id);
      if (chats.length === 0) {
        return { 
          success: true, 
          message: '💬 No chats yet.\n\nJust send a message to start, or use:\n/chat <name> - Create a named chat'
        };
      }

      let msg = '💬 Your Chats:\n\n';
      for (const chat of chats) {
        const status = chat.active ? '🟢' : '⚪';
        const name = chat.chat_name === 'default' ? 'default (main)' : chat.chat_name;
        msg += `${status} ${name}\n`;
      }
      msg += '\n📋 Commands:\n';
      msg += '/chat <name> - Switch to or create chat\n';
      msg += '/reset - Clear current chat context';
      return { success: true, message: msg };
    }

    case 'chat': {
      if (!args[0]) {
        // Show current chat
        const session = await sessionDb.getActiveSession(conversation.id);
        const currentChat = session?.chat_name || 'default';
        return { 
          success: true, 
          message: `💬 Current chat: ${currentChat}\n\nUsage: /chat <name> to switch or create`
        };
      }

      const chatName = args[0].toLowerCase().replace(/[^a-z0-9-_]/g, '');
      if (chatName.length < 1 || chatName.length > 50) {
        return { success: false, message: '❌ Chat name must be 1-50 alphanumeric characters' };
      }

      const { created } = await sessionDb.switchChat(
        conversation.id,
        chatName,
        conversation.ai_assistant_type
      );

      if (created) {
        return { 
          success: true, 
          message: `✨ Created new chat: ${chatName}\n\n💬 Send your message to start this conversation.`
        };
      }
      return { 
        success: true, 
        message: `🔄 Switched to chat: ${chatName}\n\n💬 Continuing where you left off.`,
        modified: true
      };
    }

    // Droid configuration commands - auto-create session if needed
    case 'droid-model': {
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /droid-model <model-id>\n\nAvailable: glm-4.7, gpt-5.2, gemini-3-flash-preview' };
      }
      const model = args[0].toLowerCase();
      const allowed = ['glm-4.7', 'gpt-5.2', 'gemini-3-flash-preview'];
      if (!allowed.includes(model)) {
        return { success: false, message: `❌ Invalid model.\n\nAvailable: ${allowed.join(', ')}` };
      }

      const session = await getOrCreateSession(conversation);
      await sessionDb.updateSessionMetadata(session.id, { droidModel: model });
      return { success: true, message: `✅ Model set to: ${model}` };
    }

    case 'droid-reasoning': {
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /droid-reasoning <off|low|medium|high>' };
      }
      const v = args[0].toLowerCase();
      if (!['off', 'none', 'low', 'medium', 'high'].includes(v)) {
        return { success: false, message: '❌ Invalid value. Use: off|low|medium|high' };
      }
      const session = await getOrCreateSession(conversation);
      await sessionDb.updateSessionMetadata(session.id, { droidReasoningEffort: v });
      return { success: true, message: `✅ Reasoning effort set to: ${v}` };
    }

    case 'droid-spec': {
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /droid-spec <on|off>' };
      }
      const v = args[0].toLowerCase();
      if (v !== 'on' && v !== 'off') {
        return { success: false, message: '❌ Invalid value. Use: on|off' };
      }
      const session = await getOrCreateSession(conversation);
      await sessionDb.updateSessionMetadata(session.id, { droidUseSpec: v === 'on' });
      return { success: true, message: `✅ Spec mode: ${v.toUpperCase()}` };
    }

    case 'droid-spec-model': {
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /droid-spec-model <model-id>' };
      }
      const model = args[0].toLowerCase();
      const session = await getOrCreateSession(conversation);
      await sessionDb.updateSessionMetadata(session.id, { droidSpecModel: model });
      return { success: true, message: `✅ Spec model set to: ${model}` };
    }

    case 'droid-spec-reasoning': {
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /droid-spec-reasoning <off|low|medium|high>' };
      }
      const v = args[0].toLowerCase();
      if (!['off', 'none', 'low', 'medium', 'high'].includes(v)) {
        return { success: false, message: '❌ Invalid value. Use: off|low|medium|high' };
      }
      const session = await getOrCreateSession(conversation);
      await sessionDb.updateSessionMetadata(session.id, { droidSpecReasoningEffort: v });
      return { success: true, message: `✅ Spec reasoning set to: ${v}` };
    }

    case 'droid-auto': {
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /droid-auto <normal|low|medium|high>\n\n⚠️ Higher levels allow more autonomous actions!' };
      }
      const v = args[0].toLowerCase();
      if (!['normal', 'low', 'medium', 'high'].includes(v)) {
        return { success: false, message: '❌ Invalid value. Use: normal|low|medium|high' };
      }
      const session = await getOrCreateSession(conversation);
      await sessionDb.updateSessionMetadata(session.id, { droidAuto: v });
      
      const warnings: Record<string, string> = {
        normal: '✅ Autonomy: NORMAL (read-only)',
        low: '✅ Autonomy: LOW (safe tools only)',
        medium: '⚠️ Autonomy: MEDIUM (most tools allowed)',
        high: '🚨 Autonomy: HIGH (all tools, minimal confirmation)',
      };
      return { success: true, message: warnings[v] };
    }

    case 'team': {
      let msg = `⭐ NOVA Constellation\n\n`;
      
      for (const [name, agent] of Object.entries(NOVA_AGENTS)) {
        msg += `${agent.emoji} ${name} ${agent.id}\n`;
        msg += `   ${agent.role} (${agent.strength})\n`;
        msg += `   Triggers: ${agent.triggers.slice(0, 3).join(', ')}\n\n`;
      }
      
      msg += `🔒 Veto Power:\n`;
      msg += `• SIRIUS - UI/UX decisions\n`;
      msg += `• ARCTURUS - Security/Quality\n\n`;
      msg += `Use: /activate <agent> <mission>`;
      
      return { success: true, message: msg };
    }

    case 'templates': {
      return {
        success: true,
        message: `📝 NOVA Activation Examples:

⭐ Strategy & Planning:
/activate POLARIS Build user authentication system

🔭 Research & Architecture:
/activate VEGA Which database is best for real-time features?

✨ Design & UX:
/activate SIRIUS Redesign the dashboard for better UX

🔷 Frontend Development:
/activate RIGEL Build the login form component

❤️ Backend Development:
/activate ANTARES Create REST API for user management

🛡️ Security & Quality:
/activate ARCTURUS Security audit before v2.0 release

🌟 Constellation Mode (multiple agents):
"activate POLARIS and VEGA (Build scalable auth system)"

💡 Natural language also works:
"activate POLARIS (Build auth system)"`,
      };
    }

    case 'activate': {
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /activate <agent> <mission>\n\nUse /team to see NOVA agents.' };
      }
      const member = normalizeAgentName(args[0]);
      if (!member) {
        return { success: false, message: `❌ Unknown agent: ${args[0]}\n\nUse /team to see NOVA agents.` };
      }

      const mission = args.slice(1).join(' ').trim();
      if (!mission) {
        return { success: false, message: '❌ Provide a mission after the agent name.\n\nExample: /activate POLARIS Build auth system' };
      }

      const activationPrompt = buildActivationTemplate(member, mission);
      const session = await getOrCreateSession(conversation);

      await sessionDb.updateSessionMetadata(session.id, {
        novaActiveAgent: member,
        novaMission: mission,
        novaActivationPrompt: activationPrompt,
      });

      return {
        success: true,
        message: activationPrompt,
      };
    }

    case 'deactivate': {
      const session = await sessionDb.getActiveSession(conversation.id);
      if (!session) {
        return { success: true, message: '💡 No active NOVA agent.' };
      }
      const activeAgent = session.metadata?.novaActiveAgent as string;
      await sessionDb.updateSessionMetadata(session.id, {
        novaActiveAgent: '',
        novaMission: '',
        novaActivationPrompt: '',
      });
      
      if (activeAgent && NOVA_AGENTS[activeAgent]) {
        const agent = NOVA_AGENTS[activeAgent];
        return { success: true, message: `${agent.emoji} ${activeAgent} ${agent.id} deactivated.\n\nConstellation standing by.` };
      }
      return { success: true, message: '✅ NOVA agent deactivated.' };
    }

    case 'handoff': {
      if (args.length < 2) {
        return { success: false, message: '❌ Usage: /handoff <to-agent> <context>\n\nExample: /handoff RIGEL Implement the login form we designed' };
      }
      
      const toAgent = normalizeAgentName(args[0]);
      if (!toAgent) {
        return { success: false, message: `❌ Unknown agent: ${args[0]}\n\nUse /team to see NOVA agents.` };
      }
      
      const session = await sessionDb.getActiveSession(conversation.id);
      const fromAgent = session?.metadata?.novaActiveAgent as string || 'POLARIS';
      const context = args.slice(1).join(' ').trim();
      
      const fromInfo = NOVA_AGENTS[fromAgent] || NOVA_AGENTS['POLARIS'];
      const toInfo = NOVA_AGENTS[toAgent];
      
      // Update session with new agent
      const activeSession = await getOrCreateSession(conversation);
      await sessionDb.updateSessionMetadata(activeSession.id, {
        novaActiveAgent: toAgent,
        novaMission: context,
        novaHandoffFrom: fromAgent,
      });
      
      return {
        success: true,
        message: `🔄 HANDOFF: ${fromInfo.emoji} ${fromAgent} → ${toInfo.emoji} ${toAgent}

📋 Context: ${context}

${toInfo.emoji} ${toAgent} ${toInfo.id} now active.
${toInfo.role} ready.

Send your next message to continue with ${toAgent}.`,
      };
    }

    case 'constellation': {
      if (!args.length) {
        return { success: false, message: '❌ Usage: /constellation <agent1> <agent2> ... <mission>\n\nExample: /constellation POLARIS VEGA Research and plan auth system' };
      }
      
      // Parse agents and mission
      const agents: string[] = [];
      let missionStart = 0;
      
      for (let i = 0; i < args.length; i++) {
        const normalized = normalizeAgentName(args[i]);
        if (normalized) {
          agents.push(normalized);
          missionStart = i + 1;
        } else {
          break;
        }
      }
      
      if (agents.length < 2) {
        return { success: false, message: '❌ Constellation mode requires at least 2 agents.\n\nExample: /constellation POLARIS VEGA Research auth' };
      }
      
      const mission = args.slice(missionStart).join(' ').trim();
      if (!mission) {
        return { success: false, message: '❌ Provide a mission after the agents.\n\nExample: /constellation POLARIS VEGA Research auth' };
      }
      
      const session = await getOrCreateSession(conversation);
      await sessionDb.updateSessionMetadata(session.id, {
        novaActiveAgent: agents[0], // Primary commander
        novaConstellation: agents,
        novaMission: mission,
      });
      
      let msg = `🌟 CONSTELLATION MODE ACTIVATED\n\n`;
      msg += `📋 Mission: ${mission}\n\n`;
      msg += `Active Agents:\n`;
      
      for (const agentName of agents) {
        const agent = NOVA_AGENTS[agentName];
        msg += `${agent.emoji} ${agentName} ${agent.id} - ${agent.role}\n`;
      }
      
      msg += `\n⭐ ${agents[0]} leads coordination.\n`;
      msg += `🔒 SIRIUS/ARCTURUS retain veto power.\n\n`;
      msg += `Send your message to begin multi-agent work.`;
      
      return { success: true, message: msg };
    }

    case 'nova_loop': {
      const session = await sessionDb.getActiveSession(conversation.id);
      if (!session?.metadata?.novaActiveAgent) {
        return { success: false, message: '❌ No active NOVA agent. Use /activate first.' };
      }
      
      return {
        success: true,
        message: `🔄 Cognitive Loop v2.0 Protocol

Execute this cognitive cycle for your next response:

0. META-PLAN → "How should I approach this?"
1. DRAFT → Generate initial solution (fast)
2. SELF-CORRECT → "What mistakes did I just make?"
3. CRITIQUE → "What would a Principal Engineer reject?"
4. REFINE → Address each critique systematically
5. VERIFY → Prove it works (run code, check docs)
6. CHECKPOINT → Record reasoning for future learning

Rule: No output leaves until it survives the Loop.

Send your task to begin the loop.`,
      };
    }

    case 'nova_checkpoint': {
      if (!args.length) {
        return { success: false, message: '❌ Usage: /nova_checkpoint <reasoning summary>' };
      }
      
      const session = await getOrCreateSession(conversation);
      const checkpoints = Array.isArray(session.metadata?.novaCheckpoints) 
        ? session.metadata.novaCheckpoints as string[]
        : [];
      
      const checkpoint = {
        timestamp: new Date().toISOString(),
        content: args.join(' '),
        agent: session.metadata?.novaActiveAgent || 'UNKNOWN'
      };
      
      checkpoints.push(JSON.stringify(checkpoint));
      
      await sessionDb.updateSessionMetadata(session.id, {
        novaCheckpoints: checkpoints
      });
      
      return {
        success: true,
        message: `✅ Checkpoint saved (#${checkpoints.length})\n\n📋 ${args.join(' ').substring(0, 100)}${args.join(' ').length > 100 ? '...' : ''}`,
      };
    }

    case 'nova_checkpoints': {
      const session = await sessionDb.getActiveSession(conversation.id);
      const checkpoints = Array.isArray(session?.metadata?.novaCheckpoints) 
        ? session.metadata.novaCheckpoints as string[]
        : [];
      
      if (!checkpoints.length) {
        return { success: true, message: '📋 No checkpoints recorded.\n\nUse /nova_checkpoint <summary> to save reasoning.' };
      }
      
      let msg = `📋 NOVA Checkpoints (${checkpoints.length})\n\n`;
      
      for (let i = 0; i < Math.min(checkpoints.length, 5); i++) {
        try {
          const cp = JSON.parse(checkpoints[checkpoints.length - 1 - i]);
          const time = new Date(cp.timestamp).toLocaleTimeString();
          msg += `${i + 1}. [${time}] ${cp.agent}: ${cp.content.substring(0, 60)}...\n`;
        } catch {
          msg += `${i + 1}. ${checkpoints[checkpoints.length - 1 - i].substring(0, 60)}...\n`;
        }
      }
      
      if (checkpoints.length > 5) {
        msg += `\n... and ${checkpoints.length - 5} more`;
      }
      
      return { success: true, message: msg };
    }

    case 'nova_clear': {
      const session = await sessionDb.getActiveSession(conversation.id);
      if (session) {
        await sessionDb.updateSessionMetadata(session.id, {
          novaActiveAgent: '',
          novaConstellation: [],
          novaMission: '',
          novaActivationPrompt: '',
          novaHandoffFrom: '',
          novaCheckpoints: []
        });
      }
      
      return {
        success: true,
        message: '✅ NOVA state cleared.\n\nConstellation standing by. Use /activate to begin.',
      };
    }

    // ==========================================
    // NOVA SELF-HEALING DEBUG COMMANDS
    // ==========================================

    case 'nova_debug': {
      const cwd = conversation.cwd || '/workspace';
      try {
        const memory = await loadDebugMemory(cwd);
        
        if (memory.length === 0) {
          return {
            success: true,
            message: '🩺 Debug Memory: Empty\n\nNo errors have been analyzed yet. The system will automatically learn from errors as they occur.',
          };
        }
        
        // Group by category
        const byCategory: Record<string, number> = {};
        let verifiedCount = 0;
        
        for (const entry of memory) {
          byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
          if (entry.verified) verifiedCount++;
        }
        
        let msg = `🩺 NOVA Debug Memory\n\n`;
        msg += `📊 Total Entries: ${memory.length}\n`;
        msg += `✅ Verified Fixes: ${verifiedCount}\n\n`;
        msg += `📁 By Category:\n`;
        
        for (const [cat, count] of Object.entries(byCategory).sort((a, b) => b[1] - a[1])) {
          msg += `  • ${cat}: ${count}\n`;
        }
        
        // Show recent entries
        const recent = memory.slice(-5).reverse();
        if (recent.length > 0) {
          msg += `\n📋 Recent Errors:\n`;
          for (const entry of recent) {
            const time = new Date(entry.timestamp).toLocaleDateString();
            msg += `  • [${time}] ${entry.category}: ${entry.rootCause.substring(0, 40)}...\n`;
          }
        }
        
        msg += `\n💡 The system learns from each error to improve future debugging.`;
        
        return { success: true, message: msg };
      } catch (error) {
        return { success: false, message: `❌ Failed to load debug memory: ${(error as Error).message}` };
      }
    }

    case 'nova_debug_clear': {
      const cwd = conversation.cwd || '/workspace';
      try {
        const { saveDebugMemory } = await import('../nova/error-debugger');
        await saveDebugMemory(cwd, []);
        return {
          success: true,
          message: '✅ Debug memory cleared.\n\nThe system will start learning from scratch.',
        };
      } catch (error) {
        return { success: false, message: `❌ Failed to clear debug memory: ${(error as Error).message}` };
      }
    }

    // Remove the /ai command since only droid is supported
    case 'ai': {
      return {
        success: true,
        message: '💡 This system uses Droid (Factory) as the AI assistant.\n\nUse /droid-model to change the model.',
      };
    }

    // ==========================================
    // AUTONOMY SYSTEM COMMANDS
    // ==========================================

    case 'autonomy': {
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      if (!args[0]) {
        // Show current config
        let msg = `🤖 Autonomy Configuration\n\n`;
        msg += `📊 Level: ${config.level.toUpperCase()}\n\n`;
        
        msg += `🔀 Git:\n`;
        msg += `  Enabled: ${config.git.enabled ? '✅' : '❌'}\n`;
        msg += `  Push: ${config.git.allowPush ? '✅' : '❌'}\n`;
        msg += `  Auto-commit: ${config.git.autoCommit ? '✅' : '❌'}\n`;
        msg += `  Protected: ${config.git.protectedBranches.join(', ')}\n\n`;
        
        msg += `🚀 Preview:\n`;
        msg += `  Enabled: ${config.preview.enabled ? '✅' : '❌'}\n`;
        msg += `  Provider: ${config.preview.provider}\n`;
        msg += `  Auto-deploy: ${config.preview.autoDeploy ? '✅' : '❌'}\n\n`;
        
        msg += `⚡ Exec:\n`;
        msg += `  Enabled: ${config.exec.enabled ? '✅' : '❌'}\n`;
        msg += `  Timeout: ${config.exec.timeout / 1000}s\n\n`;
        
        msg += `🛡️ Safety:\n`;
        msg += `  Confirmation: ${config.safety.requireConfirmation ? '✅' : '❌'}\n`;
        msg += `  Max files: ${config.safety.maxFilesPerCommit}\n`;
        
        msg += `\nUse /autonomy level <off|low|medium|high|full> to change`;
        
        return { success: true, message: msg };
      }
      
      const subCmd = args[0].toLowerCase();
      
      if (subCmd === 'level') {
        const level = args[1]?.toLowerCase() as AutonomyLevel;
        if (!['off', 'low', 'medium', 'high', 'full'].includes(level)) {
          return { success: false, message: '❌ Usage: /autonomy level <off|low|medium|high|full>' };
        }
        
        const newConfig = applyPreset(level);
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(newConfig),
        });
        
        const warnings: Record<string, string> = {
          off: '🔒 Autonomy OFF - All autonomous features disabled',
          low: '✅ Autonomy LOW - Read-only operations only',
          medium: '⚠️ Autonomy MEDIUM - Commits allowed, push disabled',
          high: '🚨 Autonomy HIGH - Push enabled, minimal confirmation',
          full: '💀 Autonomy FULL - All restrictions removed (dangerous!)',
        };
        
        return { success: true, message: warnings[level] };
      }
      
      if (subCmd === 'git') {
        const value = args[1]?.toLowerCase();
        if (value !== 'on' && value !== 'off') {
          return { success: false, message: '❌ Usage: /autonomy git <on|off>' };
        }
        config.git.enabled = value === 'on';
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        return { success: true, message: `✅ Git operations: ${value.toUpperCase()}` };
      }
      
      if (subCmd === 'git-push') {
        const value = args[1]?.toLowerCase();
        if (value !== 'on' && value !== 'off') {
          return { success: false, message: '❌ Usage: /autonomy git-push <on|off>' };
        }
        config.git.allowPush = value === 'on';
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        return { success: true, message: `✅ Git push: ${value.toUpperCase()}` };
      }
      
      if (subCmd === 'preview') {
        const value = args[1]?.toLowerCase();
        if (value !== 'on' && value !== 'off') {
          return { success: false, message: '❌ Usage: /autonomy preview <on|off>' };
        }
        config.preview.enabled = value === 'on';
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        return { success: true, message: `✅ Preview deployments: ${value.toUpperCase()}` };
      }
      
      if (subCmd === 'exec') {
        const value = args[1]?.toLowerCase();
        if (value !== 'on' && value !== 'off') {
          return { success: false, message: '❌ Usage: /autonomy exec <on|off>' };
        }
        config.exec.enabled = value === 'on';
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        return { success: true, message: `✅ Command execution: ${value.toUpperCase()}` };
      }
      
      if (subCmd === 'exec-allow') {
        const cmd = args[1];
        if (!cmd) {
          return { success: false, message: '❌ Usage: /autonomy exec-allow <command>' };
        }
        if (!config.exec.allowlist.includes(cmd)) {
          config.exec.allowlist.push(cmd);
          await sessionDb.updateSessionMetadata(session.id, {
            autonomyConfig: serializeConfig(config),
          });
        }
        return { success: true, message: `✅ Added to allowlist: ${cmd}` };
      }
      
      if (subCmd === 'reset') {
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(DEFAULT_AUTONOMY_CONFIG),
        });
        return { success: true, message: '✅ Autonomy config reset to defaults' };
      }
      
      return { success: false, message: '❌ Unknown autonomy subcommand. Use /autonomy for help.' };
    }

    case 'git-status': {
      const cwd = conversation.cwd;
      if (!cwd) {
        return { success: false, message: '❌ No working directory. Use /clone or /setcwd first.' };
      }
      const result = await gitStatus(cwd);
      return { success: result.success, message: result.message };
    }

    case 'git-diff': {
      const cwd = conversation.cwd;
      if (!cwd) {
        return { success: false, message: '❌ No working directory. Use /clone or /setcwd first.' };
      }
      const staged = args[0]?.toLowerCase() === 'staged';
      const result = await gitDiff(cwd, staged);
      return { success: result.success, message: result.message };
    }

    case 'git-commit': {
      const cwd = conversation.cwd;
      if (!cwd) {
        return { success: false, message: '❌ No working directory. Use /clone or /setcwd first.' };
      }
      if (!args.length) {
        return { success: false, message: '❌ Usage: /git-commit <message>' };
      }
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      const message = args.join(' ');
      const result = await gitCommit(cwd, message, config);
      return { success: result.success, message: result.message };
    }

    case 'git-push': {
      const cwd = conversation.cwd;
      if (!cwd) {
        return { success: false, message: '❌ No working directory. Use /clone or /setcwd first.' };
      }
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      const branch = args[0];
      const result = await gitPush(cwd, branch, config);
      return { success: result.success, message: result.message };
    }

    case 'git-branch': {
      const cwd = conversation.cwd;
      if (!cwd) {
        return { success: false, message: '❌ No working directory. Use /clone or /setcwd first.' };
      }
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /git-branch <name>' };
      }
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      const result = await gitBranch(cwd, args[0], config);
      return { success: result.success, message: result.message };
    }

    case 'git-pull': {
      const cwd = conversation.cwd;
      if (!cwd) {
        return { success: false, message: '❌ No working directory. Use /clone or /setcwd first.' };
      }
      const result = await gitPull(cwd);
      return { success: result.success, message: result.message };
    }

    case 'git-config': {
      if (args.length < 2) {
        return { success: false, message: '❌ Usage: /git-config <name> <email>' };
      }
      const cwd = conversation.cwd;
      if (!cwd) {
        return { success: false, message: '❌ No working directory. Use /clone or /setcwd first.' };
      }
      const result = await gitConfig(cwd, args[0], args[1]);
      return { success: result.success, message: result.message };
    }

    // ==========================================
    // GitHub Token - Unified token & identity management
    // ==========================================
    case 'github-token': {
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      // No args - show comprehensive status
      if (!args[0]) {
        const hasUserToken = !!config.git.ghToken;
        const hasServerToken = !!(process.env.GH_TOKEN || process.env.GITHUB_TOKEN);
        const useDefault = config.git.useDefaultToken;
        const hasIdentity = !!(config.git.userName && config.git.userEmail);
        
        // Detect token type
        let tokenType = 'None';
        const activeToken = config.git.ghToken || (useDefault ? (process.env.GH_TOKEN || process.env.GITHUB_TOKEN) : undefined);
        if (activeToken) {
          if (activeToken.startsWith('github_pat_')) tokenType = '🔐 Fine-grained';
          else if (activeToken.startsWith('ghp_')) tokenType = '🔑 Classic';
          else tokenType = '🔑 Custom';
        }
        
        let msg = '🔑 GitHub Configuration\n\n';
        msg += `Token: ${hasUserToken ? '✅ Set' : (useDefault && hasServerToken ? '✅ Server default' : '❌ Not set')}\n`;
        msg += `Type: ${tokenType}\n`;
        msg += `Identity: ${hasIdentity ? `✅ ${config.git.userName} <${config.git.userEmail}>` : '❌ Not set'}\n\n`;
        
        if (!hasUserToken && !hasServerToken) {
          msg += '⚠️ No token available for push.\n\n';
        }
        
        msg += '📋 Commands:\n';
        msg += '/github_token <token> - Set token (auto-fetches identity)\n';
        msg += '/github_token identity <name> <email> - Manual identity\n';
        msg += '/github_token clear - Remove your token\n';
        msg += '/github_token default <on|off> - Use server token\n';
        msg += '/github_token force <token> - Set without validation\n\n';
        msg += '💡 Get token: https://github.com/settings/tokens?type=beta';
        
        return { success: true, message: msg };
      }
      
      const subCmd = args[0].toLowerCase();
      
      // /github_token clear
      if (subCmd === 'clear') {
        config.git.ghToken = undefined;
        config.git.userName = undefined;
        config.git.userEmail = undefined;
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        return { success: true, message: '✅ GitHub token and identity cleared.' };
      }
      
      // /github_token default <on|off>
      if (subCmd === 'default') {
        const value = args[1]?.toLowerCase();
        if (value !== 'on' && value !== 'off') {
          return { success: false, message: '❌ Usage: /github_token default <on|off>' };
        }
        config.git.useDefaultToken = value === 'on';
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        return { success: true, message: `✅ Use server default token: ${value.toUpperCase()}` };
      }
      
      // /github_token force <token>
      if (subCmd === 'force') {
        if (!args[1]) {
          return { success: false, message: '❌ Usage: /github_token force <token>' };
        }
        config.git.ghToken = args[1];
        config.git.useDefaultToken = false;
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        return { success: true, message: '✅ GitHub token saved (forced, no validation).' };
      }
      
      // /github_token identity <name> <email>
      if (subCmd === 'identity') {
        if (args.length < 3) {
          // Show current identity
          if (config.git.userName && config.git.userEmail) {
            return { 
              success: true, 
              message: `👤 Git Identity\n\n` +
                `Name: ${config.git.userName}\n` +
                `Email: ${config.git.userEmail}\n\n` +
                `Change: /github_token identity <name> <email>`
            };
          }
          return { 
            success: false, 
            message: '❌ Usage: /github_token identity <name> <email>\n\n' +
              'Example: /github_token identity "John Doe" john@example.com'
          };
        }
        
        const name = args[1];
        const email = args[2];
        
        if (!email.includes('@')) {
          return { success: false, message: '❌ Invalid email format.' };
        }
        
        config.git.userName = name;
        config.git.userEmail = email;
        
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        
        // Configure in current repo if available
        const cwd = conversation.cwd;
        if (cwd) {
          try {
            await execAsync(`git config user.name "${name}"`, { cwd });
            await execAsync(`git config user.email "${email}"`, { cwd });
          } catch { /* ignore */ }
        }
        
        return { 
          success: true, 
          message: `✅ Git identity configured!\n\nName: ${name}\nEmail: ${email}`
        };
      }
      
      // Token provided - validate and auto-fetch identity
      const token = args[0];
      const isFineGrained = token.startsWith('github_pat_');
      const isClassic = token.startsWith('ghp_');
      const isOAuth = token.startsWith('gho_');
      
      if (!isFineGrained && !isClassic && !isOAuth) {
        return { 
          success: false, 
          message: '⚠️ Token format not recognized.\n\n' +
            'Expected formats:\n' +
            '• github_pat_... (Fine-grained - recommended)\n' +
            '• ghp_... (Classic)\n\n' +
            'Get a token at:\nhttps://github.com/settings/tokens?type=beta\n\n' +
            'Force set: /github_token force <token>' 
        };
      }
      
      // Store token temporarily to test
      config.git.ghToken = token;
      config.git.useDefaultToken = false;
      
      // Fetch user identity from GitHub API
      const identityResult = await ghGetUserIdentity(config.git);
      
      if (!identityResult.success || !identityResult.identity) {
        // Token works but couldn't get identity - still save token
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        
        const tokenTypeMsg = isFineGrained ? '🔐 Fine-grained' : '🔑 Classic';
        return { 
          success: true, 
          message: `✅ Token saved!\n\n${tokenTypeMsg} token stored.\n\n` +
            `⚠️ Could not auto-fetch identity.\n` +
            `Set manually: /github_token identity <name> <email>`
        };
      }
      
      // Store token and identity
      config.git.userName = identityResult.identity.name;
      config.git.userEmail = identityResult.identity.email;
      
      await sessionDb.updateSessionMetadata(session.id, {
        autonomyConfig: serializeConfig(config),
      });
      
      const tokenType = isFineGrained ? '🔐 Fine-grained' : '🔑 Classic';
      
      return { 
        success: true, 
        message: `✅ GitHub configured!\n\n` +
          `${tokenType} token saved\n\n` +
          `👤 Identity:\n` +
          `   Name: ${identityResult.identity.name}\n` +
          `   Email: ${identityResult.identity.email}\n\n` +
          `Ready for: /git_commit, /git_push, /gh_repos`
      };
    }

    case 'preview': {
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      if (!config.preview.enabled) {
        return { success: false, message: '❌ Preview deployments disabled.\n\nEnable with: /autonomy preview on' };
      }
      
      // Get argument (could be build dir or GitHub repo)
      const arg = args[0] || '';
      
      // NEW: Check if argument is a GitHub repo reference (owner/repo or owner/repo#branch)
      if (arg && isGitHubRepoRef(arg)) {
        // Deploy GitHub repo directly to Vercel via API
        const result = await apiDeployGitHubRepo(conversation, arg, false);
        return { success: result.success, message: result.message };
      }
      
      // Existing flow: deploy local directory
      const cwd = conversation.cwd;
      if (!cwd) {
        return { success: false, message: '❌ No working directory. Use /clone or /setcwd first.\n\n💡 Or deploy a GitHub repo directly:\n/preview owner/repo\n/preview owner/repo#branch' };
      }
      
      const buildDir = arg;
      
      // Default to Vercel with ARCTURUS self-healing
      if (config.preview.provider === 'vercel') {
        // Use self-healing deployment (ARCTURUS auto-fix on errors)
        const result = await selfHealingDeploy(cwd, buildDir, config.preview.vercel, 'preview', 2);
        return { success: result.success, message: result.message };
      }
      
      // Fallback to other providers (Surge, etc.) - no self-healing
      if (args[0]) {
        config.preview.buildDir = args[0];
      }
      const result = await deploy(cwd, config.preview);
      return { success: result.success, message: result.message };
    }

    case 'preview-prod': {
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      if (!config.preview.enabled) {
        return { success: false, message: '❌ Preview deployments disabled.\n\nEnable with: /autonomy preview on' };
      }
      
      const arg = args[0] || '';
      
      // NEW: Check if argument is a GitHub repo reference
      if (arg && isGitHubRepoRef(arg)) {
        // Deploy GitHub repo directly to Vercel (production)
        const result = await apiDeployGitHubRepo(conversation, arg, true);
        return { success: result.success, message: result.message };
      }
      
      const cwd = conversation.cwd;
      if (!cwd) {
        return { success: false, message: '❌ No working directory. Use /clone or /setcwd first.\n\n💡 Or deploy a GitHub repo directly:\n/preview_prod owner/repo' };
      }
      
      const buildDir = arg;
      
      // Production deployment via Vercel with ARCTURUS self-healing
      if (config.preview.provider === 'vercel') {
        const result = await selfHealingDeploy(cwd, buildDir, config.preview.vercel, 'production', 2);
        return { success: result.success, message: result.message };
      }
      
      // For other providers, just use regular deploy (they don't have preview/prod distinction)
      if (args[0]) {
        config.preview.buildDir = args[0];
      }
      const result = await deploy(cwd, config.preview);
      return { success: result.success, message: result.message };
    }

    case 'preview-providers': {
      const msg = await listProviders();
      return { success: true, message: msg };
    }

    case 'preview-scan': {
      const cwd = conversation.cwd;
      if (!cwd) {
        return { success: false, message: '❌ No working directory. Use /clone or /setcwd first.' };
      }
      
      const scan = await scanForDeployableContent(cwd);
      const msg = formatScanResults(scan);
      return { success: true, message: msg };
    }

    case 'surge-setup': {
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      // No args - show status
      if (!args[0]) {
        const msg = getSurgeSetupInfo(config.preview);
        return { success: true, message: msg };
      }
      
      const subCmd = args[0].toLowerCase();
      
      // /surge_setup clear - Remove user credentials
      if (subCmd === 'clear') {
        config.preview.surgeLogin = undefined;
        config.preview.surgeToken = undefined;
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        return { 
          success: true, 
          message: '✅ Surge credentials cleared.\n\nUsing server defaults if enabled.' 
        };
      }
      
      // /surge_setup default <on|off>
      if (subCmd === 'default') {
        const value = args[1]?.toLowerCase();
        if (value !== 'on' && value !== 'off') {
          return { success: false, message: '❌ Usage: /surge_setup default <on|off>' };
        }
        config.preview.useDefaultSurge = value === 'on';
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        return { 
          success: true, 
          message: `✅ Use server Surge credentials: ${value.toUpperCase()}` 
        };
      }
      
      // /surge_setup <email> <token> - Set credentials
      if (args.length >= 2) {
        const email = args[0];
        const token = args[1];
        
        // Basic email validation
        if (!email.includes('@')) {
          return { 
            success: false, 
            message: '❌ Invalid email format.\n\nUsage: /surge_setup <email> <token>' 
          };
        }
        
        // Token should be non-empty
        if (!token || token.length < 10) {
          return { 
            success: false, 
            message: '❌ Invalid token (too short).\n\nGet your token: surge login && surge token' 
          };
        }
        
        config.preview.surgeLogin = email;
        config.preview.surgeToken = token;
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        
        return { 
          success: true, 
          message: `✅ Surge credentials saved!\n\n📧 Email: ${email}\n🔑 Token: ${token.substring(0, 8)}...\n\nReady to deploy! Use /preview` 
        };
      }
      
      return { 
        success: false, 
        message: '❌ Usage:\n/surge_setup <email> <token>\n/surge_setup clear\n/surge_setup default <on|off>\n\nGet token: surge login && surge token' 
      };
    }

    // ==========================================
    // VERCEL DEPLOYMENT COMMANDS
    // ==========================================

    case 'vercel': {
      const cwd = conversation.cwd;
      
      // No args - show help and status
      if (!args[0]) {
        const session = await getOrCreateSession(conversation);
        const configJson = session.metadata?.autonomyConfig as string | undefined;
        const config = deserializeConfig(configJson);
        const msg = getVercelSetupInfo(config.preview.vercel);
        return { success: true, message: msg };
      }
      
      // Deploy to preview
      if (!cwd) {
        return { success: false, message: '❌ No working directory. Use /clone or /setcwd first.' };
      }
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      if (!config.preview.enabled) {
        return { success: false, message: '❌ Preview deployments disabled.\n\nEnable with: /autonomy preview on' };
      }
      
      const buildDir = args[0] || '';
      // Use self-healing deployment with ARCTURUS auto-fix
      const result = await selfHealingDeploy(cwd, buildDir, config.preview.vercel, 'preview', 2);
      return { success: result.success, message: result.message };
    }

    case 'vercel-prod': {
      const cwd = conversation.cwd;
      if (!cwd) {
        return { success: false, message: '❌ No working directory. Use /clone or /setcwd first.' };
      }
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      if (!config.preview.enabled) {
        return { success: false, message: '❌ Preview deployments disabled.\n\nEnable with: /autonomy preview on' };
      }
      
      const buildDir = args[0] || '';
      // Use self-healing deployment with ARCTURUS auto-fix
      const result = await selfHealingDeploy(cwd, buildDir, config.preview.vercel, 'production', 2);
      return { success: result.success, message: result.message };
    }

    case 'vercel-setup': {
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      // No args - show status
      if (!args[0]) {
        const msg = getVercelSetupInfo(config.preview.vercel);
        return { success: true, message: msg };
      }
      
      const subCmd = args[0].toLowerCase();
      
      // /vercel_setup clear - Remove user token
      if (subCmd === 'clear') {
        config.preview.vercel = {
          ...config.preview.vercel,
          token: undefined,
          projectId: undefined,
          projectName: undefined,
          orgId: undefined,
        };
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        return { 
          success: true, 
          message: '✅ Vercel configuration cleared.\n\nUsing server defaults if enabled.' 
        };
      }
      
      // /vercel_setup project <name>
      if (subCmd === 'project') {
        const projectName = args[1];
        if (!projectName) {
          return { success: false, message: '❌ Usage: /vercel_setup project <name>' };
        }
        config.preview.vercel.projectName = projectName;
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        return { 
          success: true, 
          message: `✅ Vercel project set: ${projectName}` 
        };
      }
      
      // /vercel_setup org <id>
      if (subCmd === 'org' || subCmd === 'team' || subCmd === 'scope') {
        const orgId = args[1];
        if (!orgId) {
          return { success: false, message: '❌ Usage: /vercel_setup org <team-id>' };
        }
        config.preview.vercel.orgId = orgId;
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        return { 
          success: true, 
          message: `✅ Vercel team/org set: ${orgId}` 
        };
      }
      
      // /vercel_setup default <on|off>
      if (subCmd === 'default') {
        const value = args[1]?.toLowerCase();
        if (value !== 'on' && value !== 'off') {
          return { success: false, message: '❌ Usage: /vercel_setup default <on|off>' };
        }
        config.preview.vercel.useDefaultToken = value === 'on';
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        return { 
          success: true, 
          message: `✅ Use server Vercel token: ${value.toUpperCase()}` 
        };
      }
      
      // /vercel_setup <token> - Set token
      const token = args[0];
      
      // Basic token validation (Vercel tokens are typically 24+ chars)
      if (token.length < 20) {
        return { 
          success: false, 
          message: '❌ Invalid token (too short).\n\nGet your token: https://vercel.com/account/tokens' 
        };
      }
      
      config.preview.vercel.token = token;
      await sessionDb.updateSessionMetadata(session.id, {
        autonomyConfig: serializeConfig(config),
      });
      
      return { 
        success: true, 
        message: `✅ Vercel token saved!\n\n🔑 Token: ${token.substring(0, 8)}...\n\nReady to deploy!\n/vercel [dir] - Preview\n/vercel_prod [dir] - Production` 
      };
    }

    case 'vercel-status': {
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      const msg = getVercelSetupInfo(config.preview.vercel);
      return { success: true, message: msg };
    }

    case 'vercel-debug': {
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      if (!args[0]) {
        const status = config.preview.vercel.debug ? 'ON' : 'OFF';
        return { 
          success: true, 
          message: `🔍 Vercel Debug Mode: ${status}\n\nToggle: /vercel_debug on|off` 
        };
      }
      
      const value = args[0].toLowerCase();
      if (value !== 'on' && value !== 'off') {
        return { success: false, message: '❌ Usage: /vercel_debug <on|off>' };
      }
      
      config.preview.vercel.debug = value === 'on';
      await sessionDb.updateSessionMetadata(session.id, {
        autonomyConfig: serializeConfig(config),
      });
      
      const emoji = value === 'on' ? '🔍' : '✅';
      return { 
        success: true, 
        message: `${emoji} Vercel debug mode: ${value.toUpperCase()}\n\n${value === 'on' ? 'Deployments will show verbose output.' : 'Normal output restored.'}` 
      };
    }

    case 'vercel-env': {
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      // No args - show env vars
      if (!args[0]) {
        const msg = formatVercelEnvVars(config.preview.vercel);
        return { success: true, message: msg };
      }
      
      const subCmd = args[0].toLowerCase();
      
      // /vercel_env clear - Remove all env vars
      if (subCmd === 'clear') {
        config.preview.vercel.buildEnv = {};
        config.preview.vercel.runtimeEnv = {};
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        return { success: true, message: '✅ All Vercel environment variables cleared.' };
      }
      
      // /vercel_env add KEY=value [build|runtime]
      if (subCmd === 'add') {
        const keyValue = args[1];
        if (!keyValue || !keyValue.includes('=')) {
          return { 
            success: false, 
            message: '❌ Usage: /vercel_env add KEY=value [build|runtime]\n\nExample: /vercel_env add API_URL=https://api.example.com' 
          };
        }
        
        const [key, ...valueParts] = keyValue.split('=');
        const value = valueParts.join('='); // Handle values with = in them
        const envType = args[2]?.toLowerCase() || 'runtime';
        
        if (!key || !value) {
          return { success: false, message: '❌ Invalid format. Use KEY=value' };
        }
        
        // Validate key format (alphanumeric + underscore)
        if (!/^[A-Z_][A-Z0-9_]*$/i.test(key)) {
          return { 
            success: false, 
            message: '❌ Invalid key format. Use UPPER_SNAKE_CASE.\n\nExample: API_URL, DATABASE_HOST' 
          };
        }
        
        if (envType === 'build') {
          config.preview.vercel.buildEnv = config.preview.vercel.buildEnv || {};
          config.preview.vercel.buildEnv[key] = value;
        } else {
          config.preview.vercel.runtimeEnv = config.preview.vercel.runtimeEnv || {};
          config.preview.vercel.runtimeEnv[key] = value;
        }
        
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        
        const typeLabel = envType === 'build' ? '🔨 Build-time' : '🚀 Runtime';
        return { 
          success: true, 
          message: `✅ ${typeLabel} env var added:\n${key}=${value.length > 20 ? value.substring(0, 20) + '...' : value}` 
        };
      }
      
      // /vercel_env remove KEY [build|runtime]
      if (subCmd === 'remove' || subCmd === 'rm' || subCmd === 'delete') {
        const key = args[1];
        if (!key) {
          return { success: false, message: '❌ Usage: /vercel_env remove KEY [build|runtime]' };
        }
        
        const envType = args[2]?.toLowerCase();
        let removed = false;
        
        if (!envType || envType === 'build') {
          if (config.preview.vercel.buildEnv?.[key]) {
            delete config.preview.vercel.buildEnv[key];
            removed = true;
          }
        }
        
        if (!envType || envType === 'runtime') {
          if (config.preview.vercel.runtimeEnv?.[key]) {
            delete config.preview.vercel.runtimeEnv[key];
            removed = true;
          }
        }
        
        if (!removed) {
          return { success: false, message: `❌ Environment variable not found: ${key}` };
        }
        
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        
        return { success: true, message: `✅ Removed: ${key}` };
      }
      
      return { 
        success: false, 
        message: '❌ Usage:\n/vercel_env - List all\n/vercel_env add KEY=value [build|runtime]\n/vercel_env remove KEY [build|runtime]\n/vercel_env clear' 
      };
    }

    case 'vercel-archive': {
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      if (!args[0]) {
        const status = config.preview.vercel.archive ? 'ON' : 'OFF';
        return { 
          success: true, 
          message: `📦 Vercel Archive Mode: ${status}\n\nFor large projects (1000+ files).\nToggle: /vercel_archive on|off` 
        };
      }
      
      const value = args[0].toLowerCase();
      if (value !== 'on' && value !== 'off') {
        return { success: false, message: '❌ Usage: /vercel_archive <on|off>' };
      }
      
      config.preview.vercel.archive = value === 'on';
      await sessionDb.updateSessionMetadata(session.id, {
        autonomyConfig: serializeConfig(config),
      });
      
      return { 
        success: true, 
        message: `📦 Vercel archive mode: ${value.toUpperCase()}\n\n${value === 'on' ? 'Files will be compressed before upload (recommended for large projects).' : 'Normal upload mode.'}` 
      };
    }

    case 'vercel-regions': {
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      if (!args[0]) {
        const regions = config.preview.vercel.regions || [];
        if (regions.length === 0) {
          return { 
            success: true, 
            message: `🌍 Vercel Regions: Auto (default)\n\nSet: /vercel_regions sfo1,iad1\nClear: /vercel_regions clear\n\nCommon regions: sfo1, iad1, cdg1, hnd1, syd1` 
          };
        }
        return { 
          success: true, 
          message: `🌍 Vercel Regions: ${regions.join(', ')}\n\nChange: /vercel_regions <region1,region2>\nClear: /vercel_regions clear` 
        };
      }
      
      if (args[0].toLowerCase() === 'clear') {
        config.preview.vercel.regions = [];
        await sessionDb.updateSessionMetadata(session.id, {
          autonomyConfig: serializeConfig(config),
        });
        return { success: true, message: '✅ Regions cleared. Using Vercel auto-selection.' };
      }
      
      const regions = args[0].split(',').map(r => r.trim().toLowerCase());
      config.preview.vercel.regions = regions;
      await sessionDb.updateSessionMetadata(session.id, {
        autonomyConfig: serializeConfig(config),
      });
      
      return { 
        success: true, 
        message: `✅ Vercel regions set: ${regions.join(', ')}` 
      };
    }

    case 'exec': {
      const cwd = conversation.cwd;
      if (!cwd) {
        return { success: false, message: '❌ No working directory. Use /clone or /setcwd first.' };
      }
      if (!args.length) {
        return { success: false, message: '❌ Usage: /exec <command>' };
      }
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      const command = args.join(' ');
      const result = await execSandbox(command, cwd, config.exec);
      return { success: result.success, message: result.message };
    }

    // ==========================================
    // GITHUB API COMMANDS
    // ==========================================

    case 'gh': {
      // Show GitHub help
      return {
        success: true,
        message: `🐙 GitHub Commands

📋 Browse & Clone:
/gh_repos - List your repositories
/gh_select <num> - Clone repo by number
/gh_clone <repo> - Clone by name or owner/repo

📦 Repository:
/gh_user - Show your GitHub profile
/gh_repo <owner/repo> - Get repo info
/gh_create <name> [--private] - Create new repo
/gh_fork <owner/repo> - Fork a repository

🔀 Pull Requests:
/gh_pr_create <title> - Create pull request
/gh_prs [owner/repo] - List pull requests

⚙️ Setup: /github_token <your-token>`,
      };
    }

    case 'gh-user': {
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      const result = await ghGetUser(config.git);
      return { success: result.success, message: result.message };
    }

    case 'gh-repos': {
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      const limit = args[0] ? parseInt(args[0], 10) : 15;
      const result = await ghListRepos(config.git, { limit: Math.min(limit, 30) });
      
      // Store repos in session for /gh_select
      if (result.success && result.data) {
        const repos = (result.data as { repos: Array<{ full_name: string; clone_url: string; private?: boolean }> }).repos;
        await sessionDb.updateSessionMetadata(session.id, {
          ghReposList: repos.map(r => ({ name: r.full_name, url: r.clone_url })),
        });
        
        // Enhance message with selection numbers
        let msg = `📁 Your GitHub Repositories\n\n`;
        repos.forEach((repo, i) => {
          const visibility = repo.private ? '🔒' : '🌐';
          msg += `${i + 1}. ${visibility} ${repo.full_name}\n`;
        });
        msg += `\n💡 Use /gh_select <number> to clone\n`;
        msg += `Or /gh_clone <owner/repo>`;
        
        return { success: true, message: msg };
      }
      
      return { success: result.success, message: result.message };
    }

    case 'gh-select': {
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /gh_select <number>\n\nFirst run /gh_repos to see your repositories.' };
      }
      
      const num = parseInt(args[0], 10);
      if (isNaN(num) || num < 1) {
        return { success: false, message: '❌ Please provide a valid number.' };
      }
      
      const session = await getOrCreateSession(conversation);
      const reposList = session.metadata?.ghReposList as Array<{ name: string; url: string }> | undefined;
      
      if (!reposList || reposList.length === 0) {
        return { success: false, message: '❌ No repos list found. Run /gh_repos first.' };
      }
      
      if (num > reposList.length) {
        return { success: false, message: `❌ Invalid selection. Choose 1-${reposList.length}` };
      }
      
      const selected = reposList[num - 1];
      
      // Clone the selected repo using user's token
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      const token = config.git.ghToken || (config.git.useDefaultToken ? process.env.GH_TOKEN : undefined);
      
      const repoName = selected.name.split('/').pop() || 'unknown';
      const workspacePath = process.env.WORKSPACE_PATH || '/workspace';
      const targetPath = `${workspacePath}/${repoName}`;
      
      // Check if already exists
      try {
        await access(targetPath);
        return { success: false, message: `❌ Repository already exists at ${targetPath}\n\nUse /setcwd ${targetPath} to switch to it.` };
      } catch {
        // Good - doesn't exist
      }
      
      try {
        // Build authenticated clone URL
        let cloneUrl = selected.url;
        if (token && cloneUrl.includes('github.com')) {
          cloneUrl = cloneUrl.replace('https://github.com', `https://${token}@github.com`);
        }
        
        await execAsync(`git clone ${cloneUrl} ${targetPath}`);
        await execAsync(`git config --global --add safe.directory ${targetPath}`);
        
        // Create codebase entry
        const codebase = await codebaseDb.createCodebase({
          name: repoName,
          repository_url: selected.url.replace(token || '', '***'),
          default_cwd: targetPath,
          ai_assistant_type: 'droid',
        });
        
        await db.updateConversation(conversation.id, {
          codebase_id: codebase.id,
          cwd: targetPath,
        });
        
        // Reset session
        await sessionDb.deactivateSession(session.id);
        
        return {
          success: true,
          message: `✅ Cloned: ${selected.name}\n\n📂 ${targetPath}\n\nReady to work! Send any message to start.`,
          modified: true,
        };
      } catch (error) {
        const err = error as Error;
        return { success: false, message: `❌ Clone failed: ${err.message}` };
      }
    }

    case 'gh-repo': {
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /gh_repo <owner/repo>' };
      }
      
      const parsed = ghParseRepo(args[0]);
      if (!parsed) {
        return { success: false, message: '❌ Invalid format. Use: owner/repo or full GitHub URL' };
      }
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      const result = await ghGetRepoInfo(parsed.owner, parsed.repo, config.git);
      return { success: result.success, message: result.message };
    }

    case 'gh-create': {
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /gh_create <name> [--private] [--description "desc"]' };
      }
      
      const name = args[0];
      const isPrivate = args.includes('--private');
      
      // Extract description if provided
      let description = '';
      const descIndex = args.indexOf('--description');
      if (descIndex !== -1 && args[descIndex + 1]) {
        description = args.slice(descIndex + 1).join(' ').replace(/^["']|["']$/g, '');
      }
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      const result = await ghCreateRepo(name, config.git, { 
        private: isPrivate, 
        description,
        autoInit: true 
      });
      return { success: result.success, message: result.message };
    }

    case 'gh-fork': {
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /gh_fork <owner/repo>' };
      }
      
      const parsed = ghParseRepo(args[0]);
      if (!parsed) {
        return { success: false, message: '❌ Invalid format. Use: owner/repo or full GitHub URL' };
      }
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      const result = await ghForkRepo(parsed.owner, parsed.repo, config.git);
      return { success: result.success, message: result.message };
    }

    case 'gh-pr-create': {
      const cwd = conversation.cwd;
      if (!cwd) {
        return { success: false, message: '❌ No working directory. Clone a repo first.' };
      }
      
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /gh_pr_create <title> [--base main]' };
      }
      
      // Get current branch
      let currentBranch: string;
      try {
        const { stdout } = await execAsync('git branch --show-current', { cwd });
        currentBranch = stdout.trim();
      } catch {
        return { success: false, message: '❌ Not a git repository or no branch checked out.' };
      }
      
      // Get remote URL to determine owner/repo
      let owner: string, repo: string;
      try {
        const { stdout } = await execAsync('git remote get-url origin', { cwd });
        const parsed = ghParseRepo(stdout.trim());
        if (!parsed) {
          return { success: false, message: '❌ Could not parse remote URL.' };
        }
        owner = parsed.owner;
        repo = parsed.repo;
      } catch {
        return { success: false, message: '❌ No remote origin configured.' };
      }
      
      // Parse arguments
      let base = 'main';
      const baseIndex = args.indexOf('--base');
      if (baseIndex !== -1 && args[baseIndex + 1]) {
        base = args[baseIndex + 1];
      }
      
      const title = args.filter((a, i) => 
        a !== '--base' && (baseIndex === -1 || i !== baseIndex + 1)
      ).join(' ');
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      const result = await ghCreatePR(owner, repo, title, currentBranch, base, config.git);
      return { success: result.success, message: result.message };
    }

    case 'gh-prs': {
      let owner: string, repo: string;
      
      if (args[0]) {
        const parsed = ghParseRepo(args[0]);
        if (!parsed) {
          return { success: false, message: '❌ Invalid format. Use: owner/repo' };
        }
        owner = parsed.owner;
        repo = parsed.repo;
      } else {
        // Try to get from current repo
        const cwd = conversation.cwd;
        if (!cwd) {
          return { success: false, message: '❌ Usage: /gh_prs <owner/repo> or clone a repo first' };
        }
        
        try {
          const { stdout } = await execAsync('git remote get-url origin', { cwd });
          const parsed = ghParseRepo(stdout.trim());
          if (!parsed) {
            return { success: false, message: '❌ Could not parse remote URL.' };
          }
          owner = parsed.owner;
          repo = parsed.repo;
        } catch {
          return { success: false, message: '❌ No remote origin. Use: /gh_prs <owner/repo>' };
        }
      }
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      const result = await ghListPRs(owner, repo, config.git);
      return { success: result.success, message: result.message };
    }

    case 'gh-clone': {
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /gh_clone <owner/repo> or <repo-name>\n\n💡 Tip: Use /gh_repos then /gh_select <number> for easier selection.' };
      }
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      const token = config.git.ghToken || (config.git.useDefaultToken ? process.env.GH_TOKEN : undefined);
      
      if (!token) {
        return { success: false, message: '❌ No GitHub token. Use /github_token to set one first.' };
      }
      
      let repoUrl = args[0];
      let fullName = '';
      
      // If it's just a repo name (no slash), try to find it in user's repos
      if (!repoUrl.includes('/') && !repoUrl.includes('://')) {
        // Get user info to find username
        const userResult = await ghGetUser(config.git);
        if (!userResult.success || !userResult.data) {
          return { success: false, message: '❌ Could not get GitHub user. Check your token.' };
        }
        const username = (userResult.data as { login: string }).login;
        fullName = `${username}/${repoUrl}`;
        repoUrl = `https://github.com/${fullName}.git`;
      } else if (!repoUrl.includes('://') && !repoUrl.includes('@')) {
        // owner/repo format
        const parsed = ghParseRepo(repoUrl);
        if (parsed) {
          fullName = `${parsed.owner}/${parsed.repo}`;
          repoUrl = `https://github.com/${fullName}.git`;
        }
      } else {
        // Full URL
        const parsed = ghParseRepo(repoUrl);
        if (parsed) {
          fullName = `${parsed.owner}/${parsed.repo}`;
        }
      }
      
      const repoName = fullName.split('/').pop() || repoUrl.split('/').pop()?.replace('.git', '') || 'unknown';
      const workspacePath = process.env.WORKSPACE_PATH || '/workspace';
      const targetPath = `${workspacePath}/${repoName}`;
      
      // Check if already exists
      try {
        await access(targetPath);
        return { success: false, message: `❌ Repository already exists at ${targetPath}\n\nUse /setcwd ${targetPath} to switch to it.` };
      } catch {
        // Good - doesn't exist
      }
      
      try {
        // Build authenticated clone URL
        let cloneUrl = repoUrl;
        if (token && cloneUrl.includes('github.com')) {
          cloneUrl = cloneUrl.replace('https://github.com', `https://${token}@github.com`);
        }
        
        await execAsync(`git clone ${cloneUrl} ${targetPath}`);
        await execAsync(`git config --global --add safe.directory ${targetPath}`);
        
        // Create codebase entry
        const codebase = await codebaseDb.createCodebase({
          name: repoName,
          repository_url: repoUrl,
          default_cwd: targetPath,
          ai_assistant_type: 'droid',
        });
        
        await db.updateConversation(conversation.id, {
          codebase_id: codebase.id,
          cwd: targetPath,
        });
        
        // Reset session
        await sessionDb.deactivateSession(session.id);
        
        return {
          success: true,
          message: `✅ Cloned: ${fullName || repoName}\n\n📂 ${targetPath}\n\nReady to work! Send any message to start.`,
          modified: true,
        };
      } catch (error) {
        const err = error as Error;
        if (err.message.includes('not found') || err.message.includes('404')) {
          return { success: false, message: `❌ Repository not found: ${fullName || repoUrl}\n\nCheck the name or use /gh_repos to see your repos.` };
        }
        return { success: false, message: `❌ Clone failed: ${err.message}` };
      }
    }

    // ==========================================
    // SMART EXECUTION COMMANDS (Full Autonomy)
    // ==========================================

    case 'exec-sequence': {
      const cwd = conversation.cwd;
      if (!cwd) {
        return { success: false, message: '❌ No working directory. Use /clone or /setcwd first.' };
      }
      if (!args.length) {
        return { 
          success: false, 
          message: `❌ Usage: /exec-sequence <commands>

Examples:
/exec-sequence 1. rm -rf .next 2. npm run build
/exec-sequence "1. Clear cache: rm -rf .next" "2. Rebuild: npm run build"

Or use /exec-template for common sequences.` 
        };
      }
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      const input = args.join(' ');
      const result = await smartExecSequence(input, {
        cwd,
        config: config.exec,
        autonomyLevel: config.level,
        stopOnError: true,
      });
      
      return { success: result.success, message: result.message };
    }

    case 'exec-template': {
      const cwd = conversation.cwd;
      if (!cwd) {
        return { success: false, message: '❌ No working directory. Use /clone or /setcwd first.' };
      }
      
      // No args - list templates
      if (!args.length) {
        return { success: true, message: listTemplates() };
      }
      
      const templateName = args[0].toLowerCase() as CommandTemplate;
      if (!COMMAND_TEMPLATES[templateName]) {
        const available = Object.keys(COMMAND_TEMPLATES).join(', ');
        return { 
          success: false, 
          message: `❌ Unknown template: ${args[0]}\n\nAvailable: ${available}\n\nUse /exec-template to see all templates.` 
        };
      }
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      // Check if dry run requested
      const dryRun = args.includes('--dry-run') || args.includes('-n');
      
      const result = await execTemplate(templateName, {
        cwd,
        config: config.exec,
        autonomyLevel: config.level,
        stopOnError: true,
        dryRun,
      });
      
      return { success: result.success, message: result.message };
    }

    case 'exec-dry': {
      const cwd = conversation.cwd;
      if (!cwd) {
        return { success: false, message: '❌ No working directory. Use /clone or /setcwd first.' };
      }
      if (!args.length) {
        return { success: false, message: '❌ Usage: /exec-dry <commands>\n\nValidates commands without executing them.' };
      }
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);
      
      const input = args.join(' ');
      const result = await smartExecSequence(input, {
        cwd,
        config: config.exec,
        autonomyLevel: config.level,
        dryRun: true,
      });
      
      return { success: result.success, message: result.message };
    }

    case 'autonomy-full': {
      // Quick command to enable full autonomy mode
      const session = await getOrCreateSession(conversation);
      const newConfig = applyPreset('full');
      await sessionDb.updateSessionMetadata(session.id, {
        autonomyConfig: serializeConfig(newConfig),
      });
      
      return { 
        success: true, 
        message: `💀 FULL AUTONOMY MODE ENABLED

⚠️ All restrictions removed:
• Extended command allowlist (rm, chmod, etc.)
• Git push to any branch
• No confirmation required
• Maximum file limits

🛡️ Safety: Absolute blocklist still active
(Cannot rm -rf /, sudo rm, etc.)

Use /autonomy level medium to restore defaults.` 
      };
    }

    // ==========================================
    // VPS SERVICE MANAGEMENT COMMANDS
    // ==========================================

    case 'restart': {
      // Restart a service (pm2, systemd, or docker)
      if (!args[0]) {
        return { 
          success: false, 
          message: `❌ Usage: /restart <service-name>

Examples:
  /restart telegram-bot
  /restart my-app
  /restart all (restarts all pm2 processes)

💡 Use /services to list running services.` 
        };
      }

      const serviceName = args[0];
      const cwd = conversation.cwd || '/workspace';
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);

      // Try pm2 first (most common for Node.js apps)
      let result = await execSandbox(`pm2 restart ${serviceName}`, cwd, config.exec);
      
      if (result.success) {
        return { 
          success: true, 
          message: `🔄 **Service Restarted**\n\n${result.message}\n\n💡 Use /services to check status.` 
        };
      }

      // If pm2 fails, try docker-compose
      result = await execSandbox(`docker-compose restart ${serviceName}`, cwd, config.exec);
      if (result.success) {
        return { 
          success: true, 
          message: `🐳 **Docker Service Restarted**\n\n${result.message}` 
        };
      }

      return { 
        success: false, 
        message: `❌ Could not restart "${serviceName}"\n\nTried: pm2, docker-compose\n\n${result.message}` 
      };
    }

    case 'services': {
      // List running services
      const cwd = conversation.cwd || '/workspace';
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);

      let msg = '📊 **Running Services**\n\n';

      // Check pm2
      const pm2Result = await execSandbox('pm2 jlist', cwd, config.exec);
      if (pm2Result.success && pm2Result.message) {
        try {
          const processes = JSON.parse(pm2Result.message.replace(/^.*?\[/, '['));
          if (Array.isArray(processes) && processes.length > 0) {
            msg += '**PM2 Processes:**\n';
            for (const proc of processes) {
              const status = proc.pm2_env?.status === 'online' ? '🟢' : '🔴';
              const name = proc.name || 'unknown';
              const memory = proc.monit?.memory 
                ? `${Math.round(proc.monit.memory / 1024 / 1024)}MB` 
                : '-';
              const uptime = proc.pm2_env?.pm_uptime 
                ? `${Math.round((Date.now() - proc.pm2_env.pm_uptime) / 1000 / 60)}m` 
                : '-';
              msg += `${status} \`${name}\` - ${memory} - ${uptime}\n`;
            }
            msg += '\n';
          }
        } catch {
          // pm2 output wasn't JSON, show raw
          if (pm2Result.message.includes('online') || pm2Result.message.includes('stopped')) {
            msg += '**PM2:**\n```\n' + pm2Result.message.substring(0, 500) + '\n```\n\n';
          }
        }
      }

      // Check docker
      const dockerResult = await execSandbox('docker ps --format "{{.Names}}: {{.Status}}"', cwd, config.exec);
      if (dockerResult.success && dockerResult.message && dockerResult.message.trim()) {
        msg += '**Docker Containers:**\n';
        const lines = dockerResult.message.trim().split('\n').slice(0, 10);
        for (const line of lines) {
          const isUp = line.toLowerCase().includes('up');
          msg += `${isUp ? '🟢' : '🔴'} ${line}\n`;
        }
        msg += '\n';
      }

      if (msg === '📊 **Running Services**\n\n') {
        msg += 'No pm2 or docker services found.\n\n';
        msg += '💡 Start a service:\n';
        msg += '  `pm2 start app.js --name my-app`\n';
        msg += '  `docker-compose up -d`';
      } else {
        msg += '💡 Commands: /restart <name>, /logs <name>, /stop <name>';
      }

      return { success: true, message: msg };
    }

    case 'logs': {
      // View service logs
      if (!args[0]) {
        return { 
          success: false, 
          message: '❌ Usage: /logs <service-name> [lines]\n\nExample: /logs telegram-bot 50' 
        };
      }

      const serviceName = args[0];
      const lines = args[1] ? parseInt(args[1], 10) : 30;
      const cwd = conversation.cwd || '/workspace';
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);

      // Try pm2 first
      let result = await execSandbox(`pm2 logs ${serviceName} --lines ${lines} --nostream`, cwd, config.exec);
      
      if (result.success && result.message) {
        // Truncate if too long
        let logOutput = result.message;
        if (logOutput.length > 3000) {
          logOutput = '...(truncated)\n' + logOutput.slice(-3000);
        }
        return { 
          success: true, 
          message: `📜 **Logs: ${serviceName}** (last ${lines} lines)\n\n\`\`\`\n${logOutput}\n\`\`\`` 
        };
      }

      // Try docker
      result = await execSandbox(`docker logs --tail ${lines} ${serviceName}`, cwd, config.exec);
      if (result.success && result.message) {
        let logOutput = result.message;
        if (logOutput.length > 3000) {
          logOutput = '...(truncated)\n' + logOutput.slice(-3000);
        }
        return { 
          success: true, 
          message: `🐳 **Docker Logs: ${serviceName}**\n\n\`\`\`\n${logOutput}\n\`\`\`` 
        };
      }

      return { success: false, message: `❌ Could not get logs for "${serviceName}"` };
    }

    case 'stop': {
      // Stop a service
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /stop <service-name>' };
      }

      const serviceName = args[0];
      const cwd = conversation.cwd || '/workspace';
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);

      // Try pm2 first
      let result = await execSandbox(`pm2 stop ${serviceName}`, cwd, config.exec);
      if (result.success) {
        return { success: true, message: `⏹️ **Service Stopped**\n\n${result.message}` };
      }

      // Try docker
      result = await execSandbox(`docker stop ${serviceName}`, cwd, config.exec);
      if (result.success) {
        return { success: true, message: `🐳 **Docker Container Stopped**\n\n${result.message}` };
      }

      return { success: false, message: `❌ Could not stop "${serviceName}"` };
    }

    case 'start': {
      // Start a service
      if (!args[0]) {
        return { 
          success: false, 
          message: `❌ Usage: /start <service-name>

Or start a new app:
  /start app.js --name my-app
  /start npm run start --name my-app` 
        };
      }

      const cwd = conversation.cwd || '/workspace';
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);

      const fullArgs = args.join(' ');

      // If it looks like a file or npm command, start new process
      if (fullArgs.includes('.js') || fullArgs.includes('npm') || fullArgs.includes('--name')) {
        const result = await execSandbox(`pm2 start ${fullArgs}`, cwd, config.exec);
        return { 
          success: result.success, 
          message: result.success 
            ? `▶️ **Service Started**\n\n${result.message}\n\n💡 Use /services to check status.`
            : `❌ Failed to start: ${result.message}` 
        };
      }

      // Otherwise try to restart existing stopped service
      const serviceName = args[0];
      let result = await execSandbox(`pm2 start ${serviceName}`, cwd, config.exec);
      if (result.success) {
        return { success: true, message: `▶️ **Service Started**\n\n${result.message}` };
      }

      // Try docker
      result = await execSandbox(`docker start ${serviceName}`, cwd, config.exec);
      if (result.success) {
        return { success: true, message: `🐳 **Docker Container Started**\n\n${result.message}` };
      }

      return { success: false, message: `❌ Could not start "${serviceName}"` };
    }

    case 'deploy-update': {
      // Quick deploy: git pull + restart service
      const cwd = conversation.cwd;
      if (!cwd) {
        return { success: false, message: '❌ No working directory. Use /clone or /setcwd first.' };
      }

      const serviceName = args[0];
      
      const session = await getOrCreateSession(conversation);
      const configJson = session.metadata?.autonomyConfig as string | undefined;
      const config = deserializeConfig(configJson);

      let msg = '🚀 **Deploy Update**\n\n';

      // Step 1: Git pull
      msg += '1️⃣ Pulling latest changes...\n';
      const pullResult = await gitPull(cwd);
      if (!pullResult.success) {
        return { success: false, message: `❌ Git pull failed: ${pullResult.message}` };
      }
      msg += `✅ ${pullResult.message}\n\n`;

      // Step 2: Install dependencies (if package.json exists)
      try {
        await access(join(cwd, 'package.json'));
        msg += '2️⃣ Installing dependencies...\n';
        const npmResult = await execSandbox('npm install --production', cwd, config.exec);
        if (npmResult.success) {
          msg += '✅ Dependencies updated\n\n';
        } else {
          msg += `⚠️ npm install warning: ${npmResult.message}\n\n`;
        }
      } catch {
        // No package.json, skip
      }

      // Step 3: Restart service if specified
      if (serviceName) {
        msg += `3️⃣ Restarting ${serviceName}...\n`;
        const restartResult = await execSandbox(`pm2 restart ${serviceName}`, cwd, config.exec);
        if (restartResult.success) {
          msg += `✅ Service restarted\n\n`;
        } else {
          msg += `⚠️ Restart failed: ${restartResult.message}\n`;
          msg += `💡 Try: /restart ${serviceName}\n\n`;
        }
      } else {
        msg += '💡 No service specified. Use `/deploy-update <service-name>` to auto-restart.\n\n';
      }

      msg += '✅ **Deploy complete!**';
      return { success: true, message: msg };
    }

    // ==========================================
    // NOVA MEMORY SYSTEM COMMANDS
    // ==========================================

    case 'nova_memory': {
      try {
        const { getMemoryStats, getAllAgentStates } = await import('../db/nova-memory');
        const stats = await getMemoryStats();
        const agents = await getAllAgentStates();
        
        let msg = `🧠 NOVA Memory System v7.0\n\n`;
        msg += `📊 Memory Statistics:\n`;
        msg += `  • Episodic: ${stats.episodicCount} memories\n`;
        msg += `  • Procedural: ${stats.proceduralCount} patterns\n`;
        msg += `  • Reflections: ${stats.reflectionCount} learnings\n\n`;
        
        if (stats.avgConfidence > 0) {
          msg += `📈 Learning Metrics:\n`;
          msg += `  • Avg Pattern Confidence: ${(stats.avgConfidence * 100).toFixed(1)}%\n`;
          msg += `  • Avg Reflection Effectiveness: ${(stats.avgEffectiveness * 100).toFixed(1)}%\n\n`;
        }
        
        msg += `🤖 Agent States:\n`;
        for (const agent of agents) {
          const statusIcon = agent.status === 'active' ? '🟢' : 
                            agent.status === 'blocked' ? '🔴' : '⚪';
          msg += `  ${statusIcon} ${agent.agent}: ${agent.status}`;
          if (agent.currentTask) {
            msg += ` - ${agent.currentTask.substring(0, 30)}...`;
          }
          msg += '\n';
        }
        
        msg += `\n💡 Commands:\n`;
        msg += `  /nova_memory_recent [agent] - Recent memories\n`;
        msg += `  /nova_memory_patterns [agent] - Learned patterns\n`;
        msg += `  /nova_memory_reflections - Learning from failures`;
        
        return { success: true, message: msg };
      } catch (error) {
        const err = error as Error;
        if (err.message.includes('does not exist')) {
          return {
            success: false,
            message: `❌ Memory tables not found.\n\nRun the migration:\npsql $DATABASE_URL < migrations/005_nova_memory.sql`,
          };
        }
        return { success: false, message: `❌ Memory error: ${err.message}` };
      }
    }

    case 'nova_memory_recent': {
      try {
        const { getRecentEpisodicMemories } = await import('../db/nova-memory');
        type NovaAgent = 'POLARIS' | 'VEGA' | 'SIRIUS' | 'RIGEL' | 'ANTARES' | 'ARCTURUS';
        const agent = args[0]?.toUpperCase() as NovaAgent | undefined;
        const memories = await getRecentEpisodicMemories(agent, 10);
        
        if (memories.length === 0) {
          return {
            success: true,
            message: `📭 No episodic memories found${agent ? ` for ${agent}` : ''}.\n\nMemories are created as agents complete tasks.`,
          };
        }
        
        let msg = `📜 Recent Episodic Memories${agent ? ` (${agent})` : ''}\n\n`;
        
        for (const mem of memories) {
          const date = new Date(mem.timestamp).toLocaleDateString();
          const outcomeIcon = mem.outcome === 'success' ? '✅' : 
                             mem.outcome === 'failure' ? '❌' : '⚠️';
          msg += `${outcomeIcon} [${date}] ${mem.agent}\n`;
          msg += `   ${mem.eventType}: ${mem.action.substring(0, 50)}...\n`;
          if (mem.lesson) {
            msg += `   💡 ${mem.lesson.substring(0, 40)}...\n`;
          }
          msg += '\n';
        }
        
        return { success: true, message: msg };
      } catch (error) {
        return { success: false, message: `❌ Error: ${(error as Error).message}` };
      }
    }

    case 'nova_memory_patterns': {
      try {
        const { getHighConfidenceProcedures } = await import('../db/nova-memory');
        type NovaAgent = 'POLARIS' | 'VEGA' | 'SIRIUS' | 'RIGEL' | 'ANTARES' | 'ARCTURUS';
        const agent = args[0]?.toUpperCase() as NovaAgent | undefined;
        const patterns = await getHighConfidenceProcedures(agent, 0.5);
        
        if (patterns.length === 0) {
          return {
            success: true,
            message: `📭 No procedural patterns found${agent ? ` for ${agent}` : ''}.\n\nPatterns are learned from successful task completions.`,
          };
        }
        
        let msg = `🔧 Learned Patterns${agent ? ` (${agent})` : ''}\n\n`;
        
        for (const pattern of patterns.slice(0, 10)) {
          const confidence = (pattern.confidence * 100).toFixed(0);
          const successRate = pattern.successCount + pattern.failureCount > 0
            ? ((pattern.successCount / (pattern.successCount + pattern.failureCount)) * 100).toFixed(0)
            : 'N/A';
          
          msg += `📋 ${pattern.name}\n`;
          msg += `   Agent: ${pattern.agent} | Confidence: ${confidence}%\n`;
          msg += `   Success Rate: ${successRate}% (${pattern.successCount}/${pattern.successCount + pattern.failureCount})\n`;
          msg += `   Steps: ${pattern.steps.length}\n\n`;
        }
        
        return { success: true, message: msg };
      } catch (error) {
        return { success: false, message: `❌ Error: ${(error as Error).message}` };
      }
    }

    case 'nova_memory_reflections': {
      try {
        const { findRelevantReflections } = await import('../db/nova-memory');
        const taskType = args[0] || 'general';
        const reflections = await findRelevantReflections(taskType, [], 10);
        
        if (reflections.length === 0) {
          return {
            success: true,
            message: `📭 No reflections found.\n\nReflections are created when tasks fail, capturing lessons learned.`,
          };
        }
        
        let msg = `💭 Learning Reflections\n\n`;
        
        for (const ref of reflections) {
          const date = new Date(ref.timestamp).toLocaleDateString();
          const effectiveness = (ref.effectivenessScore * 100).toFixed(0);
          
          msg += `🔍 [${date}] ${ref.agent} - ${ref.taskType}\n`;
          msg += `   Root Cause: ${ref.rootCause.substring(0, 50)}...\n`;
          msg += `   Fix: ${ref.correctionAction.substring(0, 50)}...\n`;
          msg += `   Effectiveness: ${effectiveness}% (helped ${ref.timesHelped}x)\n\n`;
        }
        
        return { success: true, message: msg };
      } catch (error) {
        return { success: false, message: `❌ Error: ${(error as Error).message}` };
      }
    }

    case 'nova_memory_add': {
      // Manual memory addition for testing
      if (args.length < 3) {
        return {
          success: false,
          message: `❌ Usage: /nova_memory_add <agent> <type> <action>\n\nTypes: task, error, handoff, feedback, decision`,
        };
      }
      
      try {
        const { createEpisodicMemory } = await import('../db/nova-memory');
        type NovaAgent = 'POLARIS' | 'VEGA' | 'SIRIUS' | 'RIGEL' | 'ANTARES' | 'ARCTURUS';
        type EventType = 'task' | 'error' | 'handoff' | 'feedback' | 'decision';
        const agent = args[0].toUpperCase() as NovaAgent;
        const eventType = args[1].toLowerCase() as EventType;
        const action = args.slice(2).join(' ');
        
        const validAgents = ['POLARIS', 'VEGA', 'SIRIUS', 'RIGEL', 'ANTARES', 'ARCTURUS'];
        const validTypes = ['task', 'error', 'handoff', 'feedback', 'decision'];
        
        if (!validAgents.includes(agent)) {
          return { success: false, message: `❌ Invalid agent. Use: ${validAgents.join(', ')}` };
        }
        if (!validTypes.includes(eventType)) {
          return { success: false, message: `❌ Invalid type. Use: ${validTypes.join(', ')}` };
        }
        
        await createEpisodicMemory({
          agent,
          eventType,
          action,
          outcome: 'success',
          conversationId: conversation.id,
        });
        
        return {
          success: true,
          message: `✅ Memory created for ${agent}: ${eventType} - ${action.substring(0, 50)}...`,
        };
      } catch (error) {
        return { success: false, message: `❌ Error: ${(error as Error).message}` };
      }
    }

    // ========================================================================
    // CONTEXT BUDGET COMMANDS (VEGA - Context Burn Prevention)
    // ========================================================================

    case 'context': {
      const session = await sessionDb.getActiveSession(conversation.id);
      const { getSystemPrompt } = await import('../prompts/system-prompt');
      const { buildNovaContextLite } = await import('../nova/steering-lite');
      const { formatBudget, createContextBudget } = await import('../nova/context-budget');

      // Get current context components
      const novaAgent = session?.metadata?.novaActiveAgent as string | undefined;
      const novaMission = session?.metadata?.novaMission as string | undefined;
      const systemPrompt = getSystemPrompt(novaAgent);
      const novaContext = novaAgent
        ? buildNovaContextLite(novaAgent.toUpperCase() as 'POLARIS' | 'VEGA' | 'SIRIUS' | 'RIGEL' | 'ANTARES' | 'ARCTURUS', novaMission || '')
        : '';

      // Estimate history (rough: count messages in session)
      const historyLength = 5; // Default estimate, could be tracked in session

      // Create budget tracker
      const budget = createContextBudget(systemPrompt, novaContext, historyLength);

      // Get files read from session metadata if tracked
      const filesRead = session?.metadata?.filesRead as Record<string, number> | undefined;
      if (filesRead) {
        for (const [path, tokens] of Object.entries(filesRead)) {
          budget.filesRead.set(path, tokens);
          budget.filesReadTokens += tokens;
          budget.remaining -= tokens;
        }
      }

      const msg = formatBudget(budget);
      return { success: true, message: msg };
    }

    case 'context-reset': {
      const session = await sessionDb.getActiveSession(conversation.id);
      if (session) {
        await sessionDb.updateSessionMetadata(session.id, {
          filesRead: {},
          contextWarningShown: false,
        });
      }
      return {
        success: true,
        message: '✅ Context tracking reset.\n\nFile read history cleared.',
      };
    }

    // ========================================================================
    // ASYNC JOB QUEUE COMMANDS (ANTARES)
    // ========================================================================
    
    case 'job': {
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /job <job-id>\n\nCheck status of a background job.' };
      }
      
      const jobId = args[0];
      
      // Support short IDs (first 8 chars)
      let job: jobQueue.Job | null = null;
      if (jobId.length === 8) {
        // Search by prefix
        const jobs = await jobQueue.getJobsByConversation(conversation.id, 50);
        job = jobs.find((j: jobQueue.Job) => j.id.startsWith(jobId)) ?? null;
      } else {
        job = await jobQueue.getJob(jobId);
      }
      
      if (!job) {
        return { success: false, message: `❌ Job not found: ${jobId}` };
      }
      
      const statusEmoji: Record<jobQueue.JobStatus, string> = {
        pending: '⏳',
        running: '🔄',
        completed: '✅',
        failed: '❌',
        cancelled: '🚫',
      };
      
      let msg = `${statusEmoji[job.status]} **Job ${job.id.substring(0, 8)}**\n\n`;
      msg += `Status: ${job.status}\n`;
      msg += `Type: ${job.job_type}\n`;
      if (job.job_name) msg += `Name: ${job.job_name}\n`;
      if (job.agent) msg += `Agent: ${job.agent}\n`;
      msg += `Priority: ${job.priority}\n`;
      msg += `Attempts: ${job.attempts}/${job.max_attempts}\n`;
      msg += `Created: ${job.created_at.toISOString()}\n`;
      
      if (job.started_at) {
        msg += `Started: ${job.started_at.toISOString()}\n`;
      }
      if (job.completed_at) {
        msg += `Completed: ${job.completed_at.toISOString()}\n`;
        const duration = job.completed_at.getTime() - (job.started_at?.getTime() ?? job.created_at.getTime());
        msg += `Duration: ${Math.round(duration / 1000)}s\n`;
      }
      
      if (job.status === 'failed' && job.error_message) {
        msg += `\n⚠️ Error: ${job.error_message}`;
      }
      
      if (job.status === 'completed' && job.result) {
        const resultMsg = (job.result as { message?: string }).message;
        if (resultMsg) {
          const preview = resultMsg.length > 200 ? resultMsg.substring(0, 197) + '...' : resultMsg;
          msg += `\n📋 Result:\n${preview}`;
        }
      }
      
      return { success: true, message: msg };
    }
    
    case 'jobs': {
      const jobs = await jobQueue.getJobsByConversation(conversation.id, 20);
      
      if (jobs.length === 0) {
        return { success: true, message: '📋 No jobs found for this conversation.\n\n💡 Complex tasks are automatically queued when NOVA_ASYNC_JOBS_ENABLED=true' };
      }
      
      const statusEmoji: Record<jobQueue.JobStatus, string> = {
        pending: '⏳',
        running: '🔄',
        completed: '✅',
        failed: '❌',
        cancelled: '🚫',
      };
      
      let msg = '📋 **Recent Jobs**\n\n';
      for (const job of jobs) {
        const shortId = job.id.substring(0, 8);
        const name = job.job_name ? job.job_name.substring(0, 30) : job.job_type;
        msg += `${statusEmoji[job.status]} \`${shortId}\` ${name}\n`;
      }
      
      msg += '\n💡 Use /job <id> for details';
      
      // Show queue stats
      const stats = await jobQueue.getJobQueueStats();
      msg += `\n\n📊 24h Stats: ${stats.pending} pending, ${stats.running} running, ${stats.completed} completed, ${stats.failed} failed`;
      
      return { success: true, message: msg };
    }
    
    case 'cancel': {
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /cancel <job-id>\n\nCancel a pending job.' };
      }
      
      const jobId = args[0];
      
      // Support short IDs
      let job: jobQueue.Job | null = null;
      if (jobId.length === 8) {
        const jobs = await jobQueue.getJobsByConversation(conversation.id, 50);
        job = jobs.find((j: jobQueue.Job) => j.id.startsWith(jobId)) ?? null;
      } else {
        job = await jobQueue.getJob(jobId);
      }
      
      if (!job) {
        return { success: false, message: `❌ Job not found: ${jobId}` };
      }
      
      if (job.status !== 'pending') {
        return { success: false, message: `❌ Cannot cancel job in '${job.status}' status. Only pending jobs can be cancelled.` };
      }
      
      await jobQueue.cancelJob(job.id);
      return { success: true, message: `🚫 Job ${job.id.substring(0, 8)} cancelled.` };
    }

    case 'job_retry': {
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /job-retry <job-id>\n\nRetry a failed or cancelled job.' };
      }
      
      const jobId = args[0];
      
      // Support short IDs
      let job: jobQueue.Job | null = null;
      if (jobId.length === 8) {
        const jobs = await jobQueue.getJobsByConversation(conversation.id, 50);
        job = jobs.find((j: jobQueue.Job) => j.id.startsWith(jobId)) ?? null;
      } else {
        job = await jobQueue.getJob(jobId);
      }
      
      if (!job) {
        return { success: false, message: `❌ Job not found: ${jobId}` };
      }
      
      if (job.status !== 'failed' && job.status !== 'cancelled') {
        return { 
          success: false, 
          message: `❌ Cannot retry job in '${job.status}' status.\n\nOnly failed or cancelled jobs can be retried.` 
        };
      }
      
      const retried = await jobQueue.retryJob(job.id);
      if (retried) {
        return { success: true, message: `🔄 Job ${job.id.substring(0, 8)} queued for retry.\n\nStatus: pending` };
      }
      return { success: false, message: `❌ Failed to retry job ${job.id.substring(0, 8)}` };
    }

    case 'job_logs': {
      if (!args[0]) {
        return { success: false, message: '❌ Usage: /job-logs <job-id>\n\nView execution logs for a job.' };
      }
      
      const jobId = args[0];
      
      // Support short IDs
      let job: jobQueue.Job | null = null;
      if (jobId.length === 8) {
        const jobs = await jobQueue.getJobsByConversation(conversation.id, 50);
        job = jobs.find((j: jobQueue.Job) => j.id.startsWith(jobId)) ?? null;
      } else {
        job = await jobQueue.getJob(jobId);
      }
      
      if (!job) {
        return { success: false, message: `❌ Job not found: ${jobId}` };
      }
      
      const logs = await jobQueue.getJobLogs(job.id, 20);
      
      if (logs.length === 0) {
        return { success: true, message: `📋 No logs for job ${job.id.substring(0, 8)}` };
      }
      
      const levelEmoji: Record<jobQueue.JobLogLevel, string> = {
        debug: '🔍',
        info: 'ℹ️',
        warn: '⚠️',
        error: '❌',
      };
      
      let msg = `📋 **Logs for ${job.id.substring(0, 8)}**\n\n`;
      for (const log of logs.reverse()) {
        const time = log.timestamp.toISOString().substring(11, 19);
        msg += `${levelEmoji[log.level]} [${time}] ${log.message}\n`;
      }
      
      return { success: true, message: msg };
    }

    case 'job_priority': {
      if (args.length < 2) {
        return { 
          success: false, 
          message: '❌ Usage: /job-priority <job-id> <0-100>\n\nChange priority of a pending job.\nHigher = more urgent (default: 50)' 
        };
      }
      
      const jobId = args[0];
      const priority = parseInt(args[1], 10);
      
      if (isNaN(priority) || priority < 0 || priority > 100) {
        return { success: false, message: '❌ Priority must be a number between 0 and 100.' };
      }
      
      // Support short IDs
      let job: jobQueue.Job | null = null;
      if (jobId.length === 8) {
        const jobs = await jobQueue.getJobsByConversation(conversation.id, 50);
        job = jobs.find((j: jobQueue.Job) => j.id.startsWith(jobId)) ?? null;
      } else {
        job = await jobQueue.getJob(jobId);
      }
      
      if (!job) {
        return { success: false, message: `❌ Job not found: ${jobId}` };
      }
      
      if (job.status !== 'pending') {
        return { success: false, message: `❌ Can only change priority of pending jobs.` };
      }
      
      const updated = await jobQueue.updateJobPriority(job.id, priority);
      if (updated) {
        const urgency = priority >= 80 ? '🔴 HIGH' : priority >= 50 ? '🟡 NORMAL' : '🟢 LOW';
        return { 
          success: true, 
          message: `✅ Job ${job.id.substring(0, 8)} priority: ${priority} (${urgency})` 
        };
      }
      return { success: false, message: `❌ Failed to update priority.` };
    }

    case 'job_stats': {
      const hours = args[0] ? parseInt(args[0], 10) : 24;
      if (isNaN(hours) || hours < 1 || hours > 168) {
        return { success: false, message: '❌ Hours must be between 1 and 168 (1 week).' };
      }
      
      const stats = await jobQueue.getJobQueueStats(hours);
      
      let msg = `📊 **Job Queue Stats** (${hours}h)\n\n`;
      msg += `⏳ Pending: ${stats.pending}\n`;
      msg += `🔄 Running: ${stats.running}\n`;
      msg += `✅ Completed: ${stats.completed}\n`;
      msg += `❌ Failed: ${stats.failed}\n`;
      msg += `🚫 Cancelled: ${stats.cancelled}\n`;
      msg += `━━━━━━━━━━━━━━━\n`;
      msg += `📈 Total: ${stats.total}\n`;
      
      if (stats.avgDurationMs !== null) {
        const avgSec = Math.round(stats.avgDurationMs / 1000);
        msg += `⏱️ Avg Duration: ${avgSec}s\n`;
      }
      
      // Success rate
      const processed = stats.completed + stats.failed;
      if (processed > 0) {
        const successRate = Math.round((stats.completed / processed) * 100);
        msg += `📉 Success Rate: ${successRate}%`;
      }
      
      return { success: true, message: msg };
    }

    case 'job_pending': {
      const limit = args[0] ? parseInt(args[0], 10) : 10;
      const jobs = await jobQueue.getJobsByStatus('pending', Math.min(limit, 50));
      
      if (jobs.length === 0) {
        return { success: true, message: '✅ No pending jobs in queue.' };
      }
      
      let msg = `⏳ **Pending Jobs** (${jobs.length})\n\n`;
      for (const job of jobs) {
        const shortId = job.id.substring(0, 8);
        const name = job.job_name ? job.job_name.substring(0, 25) : job.job_type;
        const priority = job.priority >= 80 ? '🔴' : job.priority >= 50 ? '🟡' : '🟢';
        msg += `${priority} \`${shortId}\` ${name} (P${job.priority})\n`;
      }
      
      msg += '\n💡 /job_priority <id> <0-100> to change priority';
      
      return { success: true, message: msg };
    }

    case 'job_running': {
      const jobs = await jobQueue.getJobsByStatus('running', 20);
      
      if (jobs.length === 0) {
        return { success: true, message: '✅ No jobs currently running.' };
      }
      
      let msg = `🔄 **Running Jobs** (${jobs.length})\n\n`;
      for (const job of jobs) {
        const shortId = job.id.substring(0, 8);
        const name = job.job_name ? job.job_name.substring(0, 25) : job.job_type;
        const elapsed = job.started_at 
          ? Math.round((Date.now() - job.started_at.getTime()) / 1000)
          : 0;
        msg += `🔄 \`${shortId}\` ${name} (${elapsed}s)\n`;
      }
      
      return { success: true, message: msg };
    }

    case 'job_failed': {
      const limit = args[0] ? parseInt(args[0], 10) : 10;
      const jobs = await jobQueue.getJobsByStatus('failed', Math.min(limit, 50));
      
      if (jobs.length === 0) {
        return { success: true, message: '✅ No failed jobs.' };
      }
      
      let msg = `❌ **Failed Jobs** (${jobs.length})\n\n`;
      for (const job of jobs) {
        const shortId = job.id.substring(0, 8);
        const name = job.job_name ? job.job_name.substring(0, 20) : job.job_type;
        const error = job.error_message 
          ? job.error_message.substring(0, 30) + (job.error_message.length > 30 ? '...' : '')
          : 'Unknown error';
        msg += `❌ \`${shortId}\` ${name}\n   └─ ${error}\n`;
      }
      
      msg += '\n💡 /job_retry <id> to retry a failed job';
      
      return { success: true, message: msg };
    }

    case 'job_cleanup': {
      const days = args[0] ? parseInt(args[0], 10) : 7;
      if (isNaN(days) || days < 1 || days > 30) {
        return { success: false, message: '❌ Days must be between 1 and 30.' };
      }
      
      const deleted = await jobQueue.cleanupOldJobs(days);
      return { 
        success: true, 
        message: `🧹 Cleaned up ${deleted} jobs older than ${days} days.` 
      };
    }

    case 'job_help': {
      return {
        success: true,
        message: `📋 **Job Management Commands**

📊 Status & Monitoring:
  /job <id> - View job details
  /jobs - List recent jobs
  /job_stats [hours] - Queue statistics (default: 24h)
  /job_logs <id> - View job execution logs

📋 Queue Views:
  /job_pending [limit] - List pending jobs
  /job_running - List running jobs
  /job_failed [limit] - List failed jobs

🔧 Job Control:
  /cancel <id> - Cancel pending job
  /job_retry <id> - Retry failed/cancelled job
  /job_priority <id> <0-100> - Change job priority

🧹 Maintenance:
  /job_cleanup [days] - Remove old completed jobs

💡 Tips:
• Use first 8 chars of job ID (e.g., \`a1b2c3d4\`)
• Priority: 0-100 (higher = more urgent)
• Jobs auto-retry on failure (max 3 attempts)`,
      };
    }

    default:
      return {
        success: false,
        message: `❌ Unknown command: /${command}\n\nType /help to see available commands.`,
      };
  }
}
