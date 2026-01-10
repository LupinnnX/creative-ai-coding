/**
 * Git Operations Module
 * Autonomous git operations with safety controls
 * 
 * NOVA Framework v6.0 - ANTARES Backend Design
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { AutonomyConfig, GitConfig } from './config';

const execAsync = promisify(exec);

export interface GitResult {
  success: boolean;
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Get the effective GitHub token for git operations
 * Priority: user token > server token > none
 */
function getEffectiveToken(gitConfig: GitConfig): string | undefined {
  // User-specific token takes priority
  if (gitConfig.ghToken) {
    return gitConfig.ghToken;
  }
  
  // Fall back to server's default token if allowed
  if (gitConfig.useDefaultToken) {
    return process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  }
  
  return undefined;
}

/**
 * Execute git command with timeout and error handling
 */
async function execGit(
  cmd: string, 
  cwd: string, 
  timeout = 30000,
  gitConfig?: GitConfig
): Promise<{ stdout: string; stderr: string }> {
  // Build environment with token if available
  const env = { ...process.env };
  
  if (gitConfig) {
    const token = getEffectiveToken(gitConfig);
    if (token) {
      // Set GH_TOKEN for git credential helper
      env.GH_TOKEN = token;
      env.GITHUB_TOKEN = token;
    }
  }
  
  return execAsync(cmd, { cwd, timeout, env });
}

/**
 * Configure git user identity
 */
export async function gitConfig(
  cwd: string,
  name: string,
  email: string
): Promise<GitResult> {
  try {
    await execGit(`git config user.name "${name}"`, cwd);
    await execGit(`git config user.email "${email}"`, cwd);
    return {
      success: true,
      message: `✅ Git configured:\n  Name: ${name}\n  Email: ${email}`,
    };
  } catch (error) {
    const err = error as Error;
    return { success: false, message: `❌ Git config failed: ${err.message}` };
  }
}

/**
 * Check if git identity is configured in the repository
 */
async function isGitIdentityConfigured(cwd: string): Promise<boolean> {
  try {
    const { stdout: name } = await execGit('git config user.name', cwd);
    const { stdout: email } = await execGit('git config user.email', cwd);
    return !!(name.trim() && email.trim());
  } catch {
    return false;
  }
}

/**
 * Ensure git identity is configured before commits
 * Uses stored config or returns helpful error
 */
export async function ensureGitIdentity(
  cwd: string,
  gitConfig: GitConfig
): Promise<GitResult> {
  // Check if already configured in repo
  const isConfigured = await isGitIdentityConfigured(cwd);
  if (isConfigured) {
    return { success: true, message: '✅ Git identity already configured.' };
  }
  
  // Try to use stored identity from config
  if (gitConfig.userName && gitConfig.userEmail) {
    try {
      await execGit(`git config user.name "${gitConfig.userName}"`, cwd);
      await execGit(`git config user.email "${gitConfig.userEmail}"`, cwd);
      return {
        success: true,
        message: `✅ Git identity configured:\n  Name: ${gitConfig.userName}\n  Email: ${gitConfig.userEmail}`,
      };
    } catch (error) {
      const err = error as Error;
      return { success: false, message: `❌ Failed to configure git identity: ${err.message}` };
    }
  }
  
  // No identity available
  return {
    success: false,
    message: `❌ Git identity not configured.\n\n` +
      `Options:\n` +
      `1. /github_token <token> - Auto-configure from GitHub\n` +
      `2. /github_token identity <name> <email> - Manual setup\n` +
      `3. /git_config <name> <email> - Set for this repo only`,
  };
}

/**
 * Get git status
 */
export async function gitStatus(cwd: string): Promise<GitResult> {
  try {
    const { stdout: status } = await execGit('git status --short', cwd);
    const { stdout: branch } = await execGit('git branch --show-current', cwd);
    
    const lines = status.trim().split('\n').filter(Boolean);
    const staged = lines.filter(l => l.startsWith('M ') || l.startsWith('A ') || l.startsWith('D ')).length;
    const modified = lines.filter(l => l.startsWith(' M') || l.startsWith('??')).length;
    
    let msg = `📊 Git Status\n\n`;
    msg += `🌿 Branch: ${branch.trim()}\n`;
    msg += `📝 Staged: ${staged} files\n`;
    msg += `📄 Modified: ${modified} files\n`;
    
    if (lines.length > 0 && lines.length <= 20) {
      msg += `\n${status}`;
    } else if (lines.length > 20) {
      msg += `\n${lines.slice(0, 20).join('\n')}\n... and ${lines.length - 20} more`;
    } else {
      msg += `\n✨ Working tree clean`;
    }
    
    return {
      success: true,
      message: msg,
      data: { branch: branch.trim(), staged, modified, total: lines.length },
    };
  } catch (error) {
    const err = error as Error;
    return { success: false, message: `❌ Git status failed: ${err.message}` };
  }
}

/**
 * Create or switch branch
 */
export async function gitBranch(
  cwd: string,
  branchName: string,
  config: AutonomyConfig
): Promise<GitResult> {
  // Check if branch is protected
  if (config.git.protectedBranches.includes(branchName)) {
    return {
      success: false,
      message: `❌ Cannot switch to protected branch: ${branchName}\n\nProtected: ${config.git.protectedBranches.join(', ')}`,
    };
  }
  
  try {
    // Check if branch exists
    const { stdout: branches } = await execGit('git branch --list', cwd);
    const exists = branches.includes(branchName);
    
    if (exists) {
      await execGit(`git checkout ${branchName}`, cwd);
      return { success: true, message: `✅ Switched to branch: ${branchName}` };
    } else {
      await execGit(`git checkout -b ${branchName}`, cwd);
      return { success: true, message: `✅ Created and switched to branch: ${branchName}` };
    }
  } catch (error) {
    const err = error as Error;
    return { success: false, message: `❌ Git branch failed: ${err.message}` };
  }
}


/**
 * Stage and commit changes
 */
export async function gitCommit(
  cwd: string,
  message: string,
  config: AutonomyConfig
): Promise<GitResult> {
  if (!config.git.enabled) {
    return { success: false, message: '❌ Git operations disabled. Use /autonomy git on' };
  }
  
  // Ensure git identity is configured before committing
  const identityResult = await ensureGitIdentity(cwd, config.git);
  if (!identityResult.success) {
    return identityResult;
  }
  
  try {
    // Get current branch
    const { stdout: branch } = await execGit('git branch --show-current', cwd);
    const currentBranch = branch.trim();
    
    // Check if on protected branch
    if (config.git.protectedBranches.includes(currentBranch)) {
      return {
        success: false,
        message: `❌ Cannot commit to protected branch: ${currentBranch}\n\nCreate a feature branch first: /git-branch feature/my-feature`,
      };
    }
    
    // Check safety limits
    const { stdout: diffStat } = await execGit('git diff --stat --cached', cwd);
    const fileMatches = diffStat.match(/(\d+) files? changed/);
    const filesChanged = fileMatches ? parseInt(fileMatches[1], 10) : 0;
    
    if (filesChanged > config.safety.maxFilesPerCommit) {
      return {
        success: false,
        message: `❌ Too many files (${filesChanged}). Max: ${config.safety.maxFilesPerCommit}\n\nCommit in smaller batches.`,
      };
    }
    
    // Stage all changes
    await execGit('git add -A', cwd);
    
    // Apply commit prefix
    const fullMessage = `${config.git.commitPrefix}${message}`;
    
    // Commit
    const { stdout } = await execGit(`git commit -m "${fullMessage.replace(/"/g, '\\"')}"`, cwd);
    
    // Extract commit hash
    const hashMatch = stdout.match(/\[[\w-]+ ([a-f0-9]+)\]/);
    const hash = hashMatch ? hashMatch[1] : 'unknown';
    
    return {
      success: true,
      message: `✅ Committed: ${hash}\n\n📝 ${fullMessage}\n📊 ${filesChanged} files changed`,
      data: { hash, filesChanged, branch: currentBranch },
    };
  } catch (error) {
    const err = error as Error;
    if (err.message.includes('nothing to commit')) {
      return { success: true, message: '💡 Nothing to commit. Working tree clean.' };
    }
    // Check for identity error
    if (err.message.includes('Author identity unknown') || err.message.includes('Please tell me who you are')) {
      return {
        success: false,
        message: `❌ Git identity not configured.\n\n` +
          `Use one of these commands:\n` +
          `• /github_token <token> - Auto-configure from GitHub\n` +
          `• /github_token identity <name> <email> - Manual setup`,
      };
    }
    return { success: false, message: `❌ Git commit failed: ${err.message}` };
  }
}

/**
 * Push to remote
 */
export async function gitPush(
  cwd: string,
  branch?: string,
  config?: AutonomyConfig
): Promise<GitResult> {
  if (config && !config.git.allowPush) {
    return {
      success: false,
      message: '❌ Git push disabled.\n\nEnable with: /autonomy level high\nOr: /autonomy git-push on',
    };
  }
  
  // Check if we have a token for authentication
  const token = config ? getEffectiveToken(config.git) : (process.env.GH_TOKEN || process.env.GITHUB_TOKEN);
  
  if (!token) {
    return {
      success: false,
      message: '❌ No GitHub token configured.\n\nOptions:\n1. Set your token: /github-token <token>\n2. Use server default: /autonomy git-default on\n3. Set GH_TOKEN in environment',
    };
  }
  
  try {
    // Get current branch if not specified
    let targetBranch = branch;
    if (!targetBranch) {
      const { stdout } = await execGit('git branch --show-current', cwd);
      targetBranch = stdout.trim();
    }
    
    // Check if pushing to protected branch
    if (config?.git.protectedBranches.includes(targetBranch)) {
      return {
        success: false,
        message: `❌ Cannot push to protected branch: ${targetBranch}\n\nUse a feature branch and create a PR.`,
      };
    }
    
    // Get remote URL and convert to authenticated URL
    const { stdout: remoteUrl } = await execGit('git remote get-url origin', cwd);
    const url = remoteUrl.trim();
    
    let pushUrl = url;
    let repoPath = '';
    
    // Convert to authenticated HTTPS URL
    if (url.includes('github.com')) {
      // Extract repo path (user/repo)
      const httpsMatch = url.match(/github\.com\/(.+?)(?:\.git)?$/);
      const sshMatch = url.match(/github\.com:(.+?)(?:\.git)?$/);
      repoPath = httpsMatch?.[1] || sshMatch?.[1] || '';
      
      if (repoPath) {
        // Use authenticated URL with token
        pushUrl = `https://${token}@github.com/${repoPath}.git`;
      }
    }
    
    // Push with authenticated URL
    const { stdout, stderr } = await execGit(
      `git push ${pushUrl} ${targetBranch}`,
      cwd,
      60000, // 60s timeout for push
      config?.git
    );
    
    // Build PR link
    let prUrl = '';
    if (repoPath) {
      prUrl = `\n\n🔗 Create PR: https://github.com/${repoPath}/compare/${targetBranch}`;
    }
    
    return {
      success: true,
      message: `✅ Pushed to origin/${targetBranch}${prUrl}`,
      data: { branch: targetBranch, output: stdout || stderr },
    };
  } catch (error) {
    const err = error as Error;
    
    // Check for auth errors
    if (err.message.includes('Authentication failed') || 
        err.message.includes('403') || 
        err.message.includes('Permission denied')) {
      return {
        success: false,
        message: '❌ GitHub authentication failed.\n\nCheck your token has "repo" scope.\nUpdate with: /github-token <new-token>',
      };
    }
    
    return { success: false, message: `❌ Git push failed: ${err.message}` };
  }
}

/**
 * Get git diff summary
 */
export async function gitDiff(cwd: string, staged = false): Promise<GitResult> {
  try {
    const flag = staged ? '--cached' : '';
    const { stdout: stat } = await execGit(`git diff ${flag} --stat`, cwd);
    const { stdout: numstat } = await execGit(`git diff ${flag} --numstat`, cwd);
    
    const lines = numstat.trim().split('\n').filter(Boolean);
    let additions = 0;
    let deletions = 0;
    
    for (const line of lines) {
      const [add, del] = line.split('\t');
      additions += parseInt(add, 10) || 0;
      deletions += parseInt(del, 10) || 0;
    }
    
    let msg = `📊 Git Diff ${staged ? '(Staged)' : '(Working)'}\n\n`;
    msg += `➕ Additions: ${additions}\n`;
    msg += `➖ Deletions: ${deletions}\n`;
    msg += `📄 Files: ${lines.length}\n`;
    
    if (stat.trim()) {
      const statLines = stat.trim().split('\n');
      if (statLines.length <= 15) {
        msg += `\n${stat}`;
      } else {
        msg += `\n${statLines.slice(0, 15).join('\n')}\n... and ${statLines.length - 15} more files`;
      }
    }
    
    return {
      success: true,
      message: msg,
      data: { additions, deletions, files: lines.length },
    };
  } catch (error) {
    const err = error as Error;
    return { success: false, message: `❌ Git diff failed: ${err.message}` };
  }
}

/**
 * Pull latest changes
 */
export async function gitPull(cwd: string): Promise<GitResult> {
  try {
    const { stdout } = await execGit('git pull --rebase', cwd, 60000);
    return {
      success: true,
      message: `✅ Pulled latest changes\n\n${stdout.trim().slice(0, 500)}`,
    };
  } catch (error) {
    const err = error as Error;
    return { success: false, message: `❌ Git pull failed: ${err.message}` };
  }
}
