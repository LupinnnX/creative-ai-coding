/**
 * API-Based Operations for Existing Commands
 * Pure API operations - NO CLI execution
 * 
 * NOVA Framework v6.0 - API-First Architecture
 * January 2026
 * 
 * These functions are called by existing commands (git_commit, git_push, etc.)
 * when API mode is enabled, replacing CLI execution with REST API calls.
 * 
 * NO NEW COMMANDS - integrates with existing Telegram commands.
 */

import { Conversation } from '../types';
import * as sessionDb from '../db/sessions';
import * as codebaseDb from '../db/codebases';
import {
  GitHubAPIConfig,
  commitMultipleFiles,
  getDefaultBranch,
  getBranchRef,
  createBranch as apiCreateBranch,
  createPullRequest,
  FileChange,
} from '../api/github-api';
import {
  VercelAPIConfig,
  deployDirectory,
} from '../api/vercel-api';
import {
  deployGitHubToVercel,
  parseGitHubRepo,
  isGitHubRepoRef,
} from '../api/github-to-vercel';
import {
  createSupabaseMCPClient,
  getSupabaseSetupInfo,
} from '../api/supabase-mcp';
import { deserializeConfig } from '../autonomy/config';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get or create session for conversation
 */
async function getSession(conversation: Conversation) {
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

/**
 * Get GitHub API config from conversation's codebase
 * Uses the repo that user cloned via /clone command
 */
export async function getGitHubConfigFromConversation(
  conversation: Conversation
): Promise<{ config: GitHubAPIConfig; error?: string } | { config: null; error: string }> {
  // Get token from session config or environment
  const session = await getSession(conversation);
  const configJson = session.metadata?.autonomyConfig as string | undefined;
  const autonomyConfig = deserializeConfig(configJson);
  
  const token = autonomyConfig.git.ghToken || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    return { config: null, error: '❌ No GitHub token. Use /github_token <token>' };
  }

  // Get repo info from codebase (set when user did /clone)
  if (!conversation.codebase_id) {
    return { config: null, error: '❌ No repository. Use /clone <repo-url> first.' };
  }

  const codebase = await codebaseDb.getCodebase(conversation.codebase_id);
  if (!codebase || !codebase.repository_url) {
    return { config: null, error: '❌ Repository URL not found in codebase.' };
  }

  // Parse owner/repo from repository_url
  const repoUrl = codebase.repository_url;
  const match = repoUrl.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  
  if (!match) {
    return { config: null, error: '❌ Could not parse GitHub repo from URL.' };
  }

  const owner = match[1];
  const repo = match[2].replace('.git', '');

  return {
    config: { token, owner, repo },
  };
}

/**
 * Get Vercel API config from session
 */
export function getVercelConfigFromSession(
  session: { metadata: Record<string, unknown> }
): VercelAPIConfig | null {
  const configJson = session.metadata?.autonomyConfig as string | undefined;
  const config = deserializeConfig(configJson);
  
  const token = config.preview.vercel?.token || process.env.VERCEL_TOKEN;
  if (!token) return null;

  return {
    token,
    teamId: config.preview.vercel?.orgId,
    projectId: config.preview.vercel?.projectId,
    projectName: config.preview.vercel?.projectName,
  };
}

/**
 * Collect changed files from working directory for API commit
 * Reads actual file content to send via GitHub API
 */
export async function collectChangedFilesForAPI(cwd: string): Promise<FileChange[]> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    // Get list of changed files from git status
    const { stdout } = await execAsync('git status --porcelain', { cwd });
    const lines = stdout.trim().split('\n').filter(Boolean);
    
    const files: FileChange[] = [];
    
    for (const line of lines) {
      const status = line.substring(0, 2);
      const filePath = line.substring(3).trim();
      
      // Skip deleted files (would need DELETE API call)
      if (status.includes('D')) continue;
      
      // Skip binary files and large files
      try {
        const fullPath = join(cwd, filePath);
        const fileStat = await stat(fullPath);
        
        // Skip files > 1MB (GitHub API limit for contents API)
        if (fileStat.size > 1024 * 1024) {
          console.log(`[API] Skipping large file: ${filePath} (${fileStat.size} bytes)`);
          continue;
        }
        
        const content = await readFile(fullPath, 'utf-8');
        files.push({
          path: filePath,
          content,
          encoding: 'utf-8',
        });
      } catch {
        // File might be binary or unreadable, skip it
        console.log(`[API] Skipping unreadable file: ${filePath}`);
        continue;
      }
    }
    
    return files;
  } catch (error) {
    console.error('[API] Failed to collect changed files:', error);
    return [];
  }
}

/**
 * Get current git branch from working directory
 */
export async function getCurrentBranch(cwd: string): Promise<string | null> {
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);

  try {
    const { stdout } = await execAsync('git branch --show-current', { cwd });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

// =============================================================================
// API-BASED GIT OPERATIONS (Called by existing commands)
// =============================================================================

/**
 * Commit files via GitHub API
 * Called by /git_commit when API mode is enabled
 */
export async function apiGitCommit(
  conversation: Conversation,
  message: string
): Promise<{ success: boolean; message: string; data?: { sha: string; url: string } }> {
  const cwd = conversation.cwd;
  if (!cwd) {
    return { success: false, message: '❌ No working directory.' };
  }

  // Get GitHub config from conversation's codebase
  const ghResult = await getGitHubConfigFromConversation(conversation);
  if (!ghResult.config) {
    return { success: false, message: ghResult.error };
  }

  // Get current branch
  const branch = await getCurrentBranch(cwd);
  if (!branch) {
    return { success: false, message: '❌ Could not determine current branch.' };
  }

  // Collect changed files
  const files = await collectChangedFilesForAPI(cwd);
  if (files.length === 0) {
    return { success: true, message: '💡 No changes to commit.' };
  }

  // Commit via GitHub API
  const result = await commitMultipleFiles(
    ghResult.config,
    files,
    `[AI] ${message}`,
    branch
  );

  if (!result.success) {
    return { success: false, message: result.message };
  }

  return {
    success: true,
    message: `✅ Committed ${files.length} files\n\n` +
      `📝 [AI] ${message}\n` +
      `🌿 Branch: ${branch}\n` +
      `🔗 ${result.data?.htmlUrl || 'Commit created'}`,
    data: result.data ? { sha: result.data.sha, url: result.data.htmlUrl } : undefined,
  };
}

/**
 * Push changes via GitHub API (creates PR if on feature branch)
 * Called by /git_push when API mode is enabled
 */
export async function apiGitPush(
  conversation: Conversation,
  targetBranch?: string
): Promise<{ success: boolean; message: string; data?: { prUrl?: string } }> {
  const cwd = conversation.cwd;
  if (!cwd) {
    return { success: false, message: '❌ No working directory.' };
  }

  // Get GitHub config
  const ghResult = await getGitHubConfigFromConversation(conversation);
  if (!ghResult.config) {
    return { success: false, message: ghResult.error };
  }

  // Get current branch
  const currentBranch = await getCurrentBranch(cwd);
  if (!currentBranch) {
    return { success: false, message: '❌ Could not determine current branch.' };
  }

  const branch = targetBranch || currentBranch;

  // Check if branch exists on remote
  const branchRef = await getBranchRef(ghResult.config, branch);
  
  if (!branchRef.success) {
    // Branch doesn't exist on remote - need to create it
    // Get default branch to base from
    const defaultBranchResult = await getDefaultBranch(ghResult.config);
    if (!defaultBranchResult.success || !defaultBranchResult.data) {
      return { success: false, message: '❌ Could not get default branch.' };
    }

    // Collect local changes
    const files = await collectChangedFilesForAPI(cwd);
    if (files.length === 0) {
      return { success: true, message: '💡 No changes to push.' };
    }

    // Create branch and commit via API
    const createResult = await apiCreateBranch(ghResult.config, branch, defaultBranchResult.data);
    if (!createResult.success) {
      return { success: false, message: createResult.message };
    }

    // Commit files to new branch
    const commitResult = await commitMultipleFiles(ghResult.config, files, `[AI] Push from ${branch}`, branch);
    if (!commitResult.success) {
      return { success: false, message: commitResult.message };
    }

    // Create PR if not pushing to default branch
    if (branch !== defaultBranchResult.data) {
      const prResult = await createPullRequest(ghResult.config, {
        title: `[AI] Changes from ${branch}`,
        head: branch,
        base: defaultBranchResult.data,
        body: `Automated PR from NOVA Agent\n\nFiles:\n${files.map(f => `- ${f.path}`).join('\n')}`,
      });

      if (prResult.success && prResult.data) {
        return {
          success: true,
          message: `✅ Pushed to ${branch} and created PR\n\n` +
            `🔀 PR #${prResult.data.number}: ${prResult.data.title}\n` +
            `🔗 ${prResult.data.htmlUrl}`,
          data: { prUrl: prResult.data.htmlUrl },
        };
      }
    }

    return {
      success: true,
      message: `✅ Pushed ${files.length} files to ${branch}\n🔗 ${commitResult.data?.htmlUrl || ''}`,
    };
  }

  // Branch exists - just commit changes
  const files = await collectChangedFilesForAPI(cwd);
  if (files.length === 0) {
    return { success: true, message: '💡 No changes to push.' };
  }

  const commitResult = await commitMultipleFiles(ghResult.config, files, `[AI] Push to ${branch}`, branch);
  if (!commitResult.success) {
    return { success: false, message: commitResult.message };
  }

  return {
    success: true,
    message: `✅ Pushed ${files.length} files to ${branch}\n🔗 ${commitResult.data?.htmlUrl || ''}`,
  };
}

/**
 * Create branch via GitHub API
 * Called by /git_branch when API mode is enabled
 */
export async function apiGitBranch(
  conversation: Conversation,
  branchName: string
): Promise<{ success: boolean; message: string }> {
  // Get GitHub config
  const ghResult = await getGitHubConfigFromConversation(conversation);
  if (!ghResult.config) {
    return { success: false, message: ghResult.error };
  }

  // Get default branch to base from
  const defaultBranchResult = await getDefaultBranch(ghResult.config);
  if (!defaultBranchResult.success || !defaultBranchResult.data) {
    return { success: false, message: '❌ Could not get default branch.' };
  }

  // Create branch via API
  const result = await apiCreateBranch(ghResult.config, branchName, defaultBranchResult.data);
  
  return { success: result.success, message: result.message };
}

/**
 * Create PR via GitHub API
 * Called by /gh_pr_create
 */
export async function apiCreatePR(
  conversation: Conversation,
  title: string,
  body?: string
): Promise<{ success: boolean; message: string; data?: { number: number; url: string } }> {
  const cwd = conversation.cwd;
  if (!cwd) {
    return { success: false, message: '❌ No working directory.' };
  }

  // Get GitHub config
  const ghResult = await getGitHubConfigFromConversation(conversation);
  if (!ghResult.config) {
    return { success: false, message: ghResult.error };
  }

  // Get current branch
  const currentBranch = await getCurrentBranch(cwd);
  if (!currentBranch) {
    return { success: false, message: '❌ Could not determine current branch.' };
  }

  // Get default branch
  const defaultBranchResult = await getDefaultBranch(ghResult.config);
  if (!defaultBranchResult.success || !defaultBranchResult.data) {
    return { success: false, message: '❌ Could not get default branch.' };
  }

  if (currentBranch === defaultBranchResult.data) {
    return { 
      success: false, 
      message: `❌ Cannot create PR from ${currentBranch} to itself.\n\nCreate a feature branch first: /git_branch feature/my-feature` 
    };
  }

  // Create PR
  const result = await createPullRequest(ghResult.config, {
    title,
    body: body || `PR created by NOVA Agent`,
    head: currentBranch,
    base: defaultBranchResult.data,
  });

  if (!result.success || !result.data) {
    return { success: false, message: result.message };
  }

  return {
    success: true,
    message: result.message,
    data: { number: result.data.number, url: result.data.htmlUrl },
  };
}

// =============================================================================
// VERCEL API OPERATIONS
// =============================================================================

/**
 * Deploy via Vercel API
 * Called by /preview when API mode is enabled
 */
export async function apiVercelDeploy(
  conversation: Conversation,
  buildDir?: string,
  production: boolean = false
): Promise<{ success: boolean; message: string; data?: { url: string; id: string } }> {
  const cwd = conversation.cwd;
  if (!cwd) {
    return { success: false, message: '❌ No working directory.' };
  }

  const session = await getSession(conversation);
  const vercelConfig = getVercelConfigFromSession(session);
  
  if (!vercelConfig) {
    return { 
      success: false, 
      message: '❌ Vercel not configured.\n\nUse /vercel_setup <token>' 
    };
  }

  // Determine directory to deploy
  const dir = buildDir || 'dist';
  const fullPath = dir === '.' ? cwd : join(cwd, dir);

  // Check if directory exists
  try {
    const dirStat = await stat(fullPath);
    if (!dirStat.isDirectory()) {
      return { success: false, message: `❌ Not a directory: ${dir}` };
    }
  } catch {
    return { 
      success: false, 
      message: `❌ Directory not found: ${dir}\n\n💡 Run build first or specify correct directory` 
    };
  }

  // Deploy via API
  const result = await deployDirectory(vercelConfig, fullPath, {
    target: production ? 'production' : 'preview',
    wait: true,
  });

  if (!result.success || !result.data) {
    return { success: false, message: result.message };
  }

  return {
    success: true,
    message: `✅ Deployed to Vercel!\n\n` +
      `🎯 Target: ${production ? 'PRODUCTION' : 'PREVIEW'}\n` +
      `🔗 ${result.data.url}\n` +
      `📋 Status: ${result.data.readyState}`,
    data: { url: result.data.url, id: result.data.id },
  };
}

// =============================================================================
// SUPABASE MCP OPERATIONS
// =============================================================================

/**
 * Setup Supabase token
 */
export async function setupSupabase(
  conversation: Conversation,
  token?: string
): Promise<{ success: boolean; message: string }> {
  if (!token) {
    const hasToken = !!process.env.SUPABASE_ACCESS_TOKEN;
    return { success: true, message: getSupabaseSetupInfo(hasToken) };
  }

  const session = await getSession(conversation);
  
  await sessionDb.updateSessionMetadata(session.id, {
    supabaseToken: token,
  });

  return { 
    success: true, 
    message: '✅ Supabase token configured!\n\nUse /supabase_tables to list tables.' 
  };
}

/**
 * List Supabase tables
 */
export async function listSupabaseTables(
  conversation: Conversation,
  schema: string = 'public'
): Promise<{ success: boolean; message: string }> {
  const session = await getSession(conversation);
  const token = (session.metadata?.supabaseToken as string) || process.env.SUPABASE_ACCESS_TOKEN;
  
  if (!token) {
    return { success: false, message: '❌ Supabase not configured. Use /supabase_setup <token>' };
  }

  const client = createSupabaseMCPClient({ accessToken: token });
  if (!client) {
    return { success: false, message: '❌ Failed to create Supabase client.' };
  }

  const result = await client.listTables(schema);

  if (!result.success) {
    return { success: false, message: result.message };
  }

  let msg = `📊 Tables in ${schema}\n\n`;
  for (const table of result.data || []) {
    msg += `• ${table.name}`;
    if (table.rowCount !== undefined) {
      msg += ` (${table.rowCount} rows)`;
    }
    msg += '\n';
  }

  return { success: true, message: msg };
}

/**
 * Execute Supabase SQL query
 */
export async function executeSupabaseQuery(
  conversation: Conversation,
  query: string
): Promise<{ success: boolean; message: string }> {
  const session = await getSession(conversation);
  const token = (session.metadata?.supabaseToken as string) || process.env.SUPABASE_ACCESS_TOKEN;
  
  if (!token) {
    return { success: false, message: '❌ Supabase not configured. Use /supabase_setup <token>' };
  }

  const client = createSupabaseMCPClient({ 
    accessToken: token,
    readOnly: true,
  });
  
  if (!client) {
    return { success: false, message: '❌ Failed to create Supabase client.' };
  }

  const result = await client.executeSql(query);

  if (!result.success) {
    return { success: false, message: result.message };
  }

  const data = result.data;
  if (!data || data.rows.length === 0) {
    return { success: true, message: '📊 Query executed. No rows returned.' };
  }

  let msg = `📊 Query Results (${data.rowCount} rows)\n\n`;
  
  const rows = data.rows.slice(0, 10);
  for (const row of rows) {
    msg += JSON.stringify(row).slice(0, 100) + '\n';
  }
  
  if (data.rowCount > 10) {
    msg += `\n... and ${data.rowCount - 10} more rows`;
  }

  return { success: true, message: msg };
}

// =============================================================================
// GITHUB → VERCEL DIRECT DEPLOYMENT
// =============================================================================

/**
 * Deploy a GitHub repository directly to Vercel via API
 * No local files needed - fetches from GitHub and deploys to Vercel
 */
export async function apiDeployGitHubRepo(
  conversation: Conversation,
  repoRef: string,
  production: boolean = false
): Promise<{ success: boolean; message: string; data?: { url: string; id: string } }> {
  // Parse repo reference (owner/repo or owner/repo#branch)
  const parsed = parseGitHubRepo(repoRef);
  if (!parsed) {
    return { 
      success: false, 
      message: `❌ Invalid repo format: ${repoRef}\n\n` +
        `Use: owner/repo or owner/repo#branch\n` +
        `Example: /preview vercel/next.js#canary`
    };
  }

  const session = await getSession(conversation);
  const configJson = session.metadata?.autonomyConfig as string | undefined;
  const autonomyConfig = deserializeConfig(configJson);

  // Get GitHub token
  const ghToken = autonomyConfig.git.ghToken || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!ghToken) {
    return { success: false, message: '❌ No GitHub token. Use /github_token <token>' };
  }

  // Get Vercel config
  const vercelConfig = getVercelConfigFromSession(session);
  if (!vercelConfig) {
    return { 
      success: false, 
      message: '❌ Vercel not configured.\n\nUse /vercel_setup <token>' 
    };
  }

  // Deploy via API bridge
  const result = await deployGitHubToVercel({
    github: {
      token: ghToken,
      owner: parsed.owner,
      repo: parsed.repo,
    },
    vercel: vercelConfig,
    branch: parsed.branch,
  });

  if (!result.success || !result.data) {
    return { success: false, message: result.message };
  }

  return {
    success: true,
    message: `✅ Deployed ${parsed.owner}/${parsed.repo} to Vercel!\n\n` +
      `🌿 Branch: ${parsed.branch || 'default'}\n` +
      `🚀 Framework: ${result.data.framework || 'auto-detect'}\n` +
      `🎯 Target: ${production ? 'PRODUCTION' : 'PREVIEW'}\n` +
      `🔗 ${result.data.url}\n` +
      `📋 Status: ${result.data.readyState}`,
    data: { url: result.data.url, id: result.data.id },
  };
}

// Re-export helpers for command handler
export { isGitHubRepoRef, parseGitHubRepo };

