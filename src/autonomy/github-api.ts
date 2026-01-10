/**
 * GitHub API Operations Module
 * Full GitHub repository management via API
 * 
 * NOVA Framework v6.0 - ANTARES Backend Design
 * 
 * Best Practices (December 2025):
 * - Use fine-grained PATs over classic tokens
 * - Include X-GitHub-Api-Version header (2022-11-28)
 * - Implement exponential backoff for rate limits
 * - Use conditional requests with ETag/If-None-Match
 * - Rate limit: 5000 req/hour authenticated
 * - Check X-RateLimit-* headers in responses
 */
import { GitConfig } from './config';

const GITHUB_API = 'https://api.github.com';
const API_VERSION = '2022-11-28';

export interface GitHubResult {
  success: boolean;
  message: string;
  data?: unknown;
  rateLimit?: {
    remaining: number;
    reset: Date;
  };
}

export interface GitHubRepo {
  name: string;
  full_name: string;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  description: string | null;
  private: boolean;
  fork: boolean;
  default_branch: string;
  updated_at: string;
}

export interface GitHubPR {
  number: number;
  title: string;
  html_url: string;
  state: string;
  head: { ref: string };
  base: { ref: string };
}

interface GitHubUser {
  login: string;
  name: string | null;
  html_url: string;
  public_repos: number;
  total_private_repos?: number;
}

interface GitHubError {
  message?: string;
  errors?: Array<{ message?: string }>;
  documentation_url?: string;
}

/**
 * Get effective token from config or environment
 * Supports both classic (ghp_) and fine-grained (github_pat_) tokens
 */
function getToken(gitConfig?: GitConfig): string | undefined {
  if (gitConfig?.ghToken) return gitConfig.ghToken;
  if (gitConfig?.useDefaultToken !== false) {
    return process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  }
  return undefined;
}

/**
 * Parse rate limit headers from response
 */
function parseRateLimit(res: Response): { remaining: number; reset: Date } | undefined {
  const remaining = res.headers.get('X-RateLimit-Remaining');
  const reset = res.headers.get('X-RateLimit-Reset');
  
  if (remaining && reset) {
    return {
      remaining: parseInt(remaining, 10),
      reset: new Date(parseInt(reset, 10) * 1000),
    };
  }
  return undefined;
}

/**
 * Make authenticated GitHub API request
 * Follows GitHub REST API best practices (Dec 2025)
 */
async function githubFetch(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${GITHUB_API}${endpoint}`;
  
  return fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': API_VERSION,
      'User-Agent': 'CreativeAIDrivenCoding/2.0',
      ...options.headers,
    },
  });
}

/**
 * Handle rate limit errors with exponential backoff suggestion
 */
function handleRateLimitError(rateLimit?: { remaining: number; reset: Date }): string {
  if (rateLimit && rateLimit.remaining === 0) {
    const resetTime = rateLimit.reset.toLocaleTimeString();
    return `\n\n⏱️ Rate limit exceeded. Resets at ${resetTime}`;
  }
  return '';
}

/**
 * Get authenticated user info
 */
export async function getUser(gitConfig?: GitConfig): Promise<GitHubResult> {
  const token = getToken(gitConfig);
  if (!token) {
    return { success: false, message: '❌ No GitHub token. Use /github_token to set one.' };
  }

  try {
    const res = await githubFetch('/user', token);
    const rateLimit = parseRateLimit(res);
    
    if (!res.ok) {
      if (res.status === 401) {
        return { success: false, message: '❌ Invalid or expired token. Generate a new one at:\nhttps://github.com/settings/tokens', rateLimit };
      }
      if (res.status === 403 && rateLimit?.remaining === 0) {
        return { success: false, message: `❌ Rate limit exceeded.${handleRateLimitError(rateLimit)}`, rateLimit };
      }
      const err = (await res.json().catch(() => ({}))) as GitHubError;
      return { success: false, message: `❌ GitHub API error: ${err.message || res.statusText}`, rateLimit };
    }

    const user = (await res.json()) as GitHubUser;
    
    // Check token type
    const tokenType = token.startsWith('github_pat_') ? '🔐 Fine-grained' : 
                      token.startsWith('ghp_') ? '🔑 Classic' : '🔑 Token';
    
    return {
      success: true,
      message: `👤 GitHub User\n\n` +
        `Username: ${user.login}\n` +
        `Name: ${user.name || 'N/A'}\n` +
        `Repos: ${user.public_repos} public, ${user.total_private_repos || 0} private\n` +
        `URL: ${user.html_url}\n\n` +
        `${tokenType} authenticated\n` +
        `📊 API: ${rateLimit?.remaining ?? '?'} requests remaining`,
      data: user,
      rateLimit,
    };
  } catch (error) {
    const err = error as Error;
    return { success: false, message: `❌ Failed to get user: ${err.message}` };
  }
}

/**
 * GitHub Email interface
 */
interface GitHubEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: string | null;
}

/**
 * Get user's emails from GitHub API
 * Requires 'user:email' scope for fine-grained tokens
 */
export async function getUserEmails(gitConfig?: GitConfig): Promise<GitHubResult> {
  const token = getToken(gitConfig);
  if (!token) {
    return { success: false, message: '❌ No GitHub token.' };
  }

  try {
    const res = await githubFetch('/user/emails', token);
    const rateLimit = parseRateLimit(res);
    
    if (!res.ok) {
      if (res.status === 404 || res.status === 403) {
        // Token doesn't have email scope - try to get from user profile
        return { 
          success: false, 
          message: '⚠️ Token lacks email scope. Add "user:email" permission.',
          rateLimit 
        };
      }
      const err = (await res.json().catch(() => ({}))) as GitHubError;
      return { success: false, message: `❌ GitHub API error: ${err.message || res.statusText}`, rateLimit };
    }

    const emails = (await res.json()) as GitHubEmail[];
    const primaryEmail = emails.find(e => e.primary && e.verified);
    const anyVerified = emails.find(e => e.verified);
    
    return {
      success: true,
      message: `📧 GitHub Emails\n\n${emails.map(e => 
        `${e.primary ? '⭐' : '•'} ${e.email} ${e.verified ? '✓' : '✗'}`
      ).join('\n')}`,
      data: { 
        emails, 
        primaryEmail: primaryEmail?.email || anyVerified?.email || emails[0]?.email 
      },
      rateLimit,
    };
  } catch (error) {
    const err = error as Error;
    return { success: false, message: `❌ Failed to get emails: ${err.message}` };
  }
}

/**
 * Git Identity for commits
 */
export interface GitIdentity {
  name: string;
  email: string;
  username: string;
}

/**
 * Get user identity for git configuration
 * Fetches name and email from GitHub API
 */
export async function getUserIdentity(gitConfig?: GitConfig): Promise<GitHubResult & { identity?: GitIdentity }> {
  const token = getToken(gitConfig);
  if (!token) {
    return { success: false, message: '❌ No GitHub token. Use /github_token to configure.' };
  }

  try {
    // Fetch user profile
    const userRes = await githubFetch('/user', token);
    if (!userRes.ok) {
      if (userRes.status === 401) {
        return { success: false, message: '❌ Invalid or expired token.' };
      }
      return { success: false, message: '❌ Failed to fetch user profile.' };
    }
    
    const user = (await userRes.json()) as GitHubUser;
    const name = user.name || user.login; // Fall back to username if no name set
    
    // Try to get email
    let email = '';
    
    // First try the emails endpoint
    try {
      const emailRes = await githubFetch('/user/emails', token);
      if (emailRes.ok) {
        const emails = (await emailRes.json()) as GitHubEmail[];
        const primaryEmail = emails.find(e => e.primary && e.verified);
        const anyVerified = emails.find(e => e.verified);
        email = primaryEmail?.email || anyVerified?.email || emails[0]?.email || '';
      }
    } catch {
      // Email endpoint failed, try noreply email
    }
    
    // If no email from API, use GitHub's noreply email
    if (!email) {
      email = `${user.login}@users.noreply.github.com`;
    }
    
    const identity: GitIdentity = {
      name,
      email,
      username: user.login,
    };
    
    return {
      success: true,
      message: `✅ GitHub Identity\n\n` +
        `👤 Name: ${identity.name}\n` +
        `📧 Email: ${identity.email}\n` +
        `🔗 Username: ${identity.username}`,
      identity,
      data: identity,
    };
  } catch (error) {
    const err = error as Error;
    return { success: false, message: `❌ Failed to get identity: ${err.message}` };
  }
}

/**
 * List user's repositories
 */
export async function listRepos(
  gitConfig?: GitConfig,
  options: { type?: 'all' | 'owner' | 'member'; sort?: 'updated' | 'created' | 'pushed'; limit?: number } = {}
): Promise<GitHubResult> {
  const token = getToken(gitConfig);
  if (!token) {
    return { success: false, message: '❌ No GitHub token. Use /github_token to set one.' };
  }

  const { type = 'owner', sort = 'updated', limit = 10 } = options;

  try {
    const res = await githubFetch(`/user/repos?type=${type}&sort=${sort}&per_page=${limit}`, token);
    const rateLimit = parseRateLimit(res);
    
    if (!res.ok) {
      if (res.status === 403 && rateLimit?.remaining === 0) {
        return { success: false, message: `❌ Rate limit exceeded.${handleRateLimitError(rateLimit)}`, rateLimit };
      }
      const err = (await res.json().catch(() => ({}))) as GitHubError;
      return { success: false, message: `❌ GitHub API error: ${err.message || res.statusText}`, rateLimit };
    }

    const repos = (await res.json()) as GitHubRepo[];
    
    if (repos.length === 0) {
      return { success: true, message: '📁 No repositories found.', rateLimit };
    }

    let msg = `📁 Your GitHub Repositories (${repos.length})\n\n`;
    
    for (const repo of repos) {
      const visibility = repo.private ? '🔒' : '🌐';
      const fork = repo.fork ? '🍴' : '';
      msg += `${visibility}${fork} ${repo.full_name}\n`;
      if (repo.description) {
        msg += `   ${repo.description.slice(0, 50)}${repo.description.length > 50 ? '...' : ''}\n`;
      }
    }

    msg += `\nUse /gh_clone <repo> to clone`;

    return { success: true, message: msg, data: { repos }, rateLimit };
  } catch (error) {
    const err = error as Error;
    return { success: false, message: `❌ Failed to list repos: ${err.message}` };
  }
}

/**
 * Create a new repository
 */
export async function createRepo(
  name: string,
  gitConfig?: GitConfig,
  options: { description?: string; private?: boolean; autoInit?: boolean } = {}
): Promise<GitHubResult> {
  const token = getToken(gitConfig);
  if (!token) {
    return { success: false, message: '❌ No GitHub token. Use /github_token to set one.' };
  }

  try {
    const res = await githubFetch('/user/repos', token, {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: options.description || '',
        private: options.private ?? false,
        auto_init: options.autoInit ?? true,
      }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as GitHubError;
      if (res.status === 422 && err.errors?.[0]?.message?.includes('already exists')) {
        return { success: false, message: `❌ Repository '${name}' already exists.` };
      }
      return { success: false, message: `❌ GitHub API error: ${err.message || res.statusText}` };
    }

    const repo = (await res.json()) as GitHubRepo;
    
    return {
      success: true,
      message: `✅ Repository created!\n\n` +
        `📦 ${repo.full_name}\n` +
        `🔗 ${repo.html_url}\n` +
        `📋 Clone: ${repo.clone_url}\n\n` +
        `Use /clone ${repo.clone_url} to clone it`,
      data: repo,
    };
  } catch (error) {
    const err = error as Error;
    return { success: false, message: `❌ Failed to create repo: ${err.message}` };
  }
}

/**
 * Fork a repository
 */
export async function forkRepo(
  owner: string,
  repo: string,
  gitConfig?: GitConfig
): Promise<GitHubResult> {
  const token = getToken(gitConfig);
  if (!token) {
    return { success: false, message: '❌ No GitHub token. Use /github_token to set one.' };
  }

  try {
    const res = await githubFetch(`/repos/${owner}/${repo}/forks`, token, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as GitHubError;
      return { success: false, message: `❌ GitHub API error: ${err.message || res.statusText}` };
    }

    const forked = (await res.json()) as GitHubRepo;
    
    return {
      success: true,
      message: `✅ Repository forked!\n\n` +
        `📦 ${forked.full_name}\n` +
        `🔗 ${forked.html_url}\n\n` +
        `Use /clone ${forked.clone_url} to clone your fork`,
      data: forked,
    };
  } catch (error) {
    const err = error as Error;
    return { success: false, message: `❌ Failed to fork repo: ${err.message}` };
  }
}


/**
 * Create a pull request
 */
export async function createPR(
  owner: string,
  repo: string,
  title: string,
  head: string,
  base: string,
  gitConfig?: GitConfig,
  options: { body?: string; draft?: boolean } = {}
): Promise<GitHubResult> {
  const token = getToken(gitConfig);
  if (!token) {
    return { success: false, message: '❌ No GitHub token. Use /github_token to set one.' };
  }

  try {
    const res = await githubFetch(`/repos/${owner}/${repo}/pulls`, token, {
      method: 'POST',
      body: JSON.stringify({
        title,
        head,
        base,
        body: options.body || '',
        draft: options.draft ?? false,
      }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as GitHubError;
      if (err.errors?.[0]?.message?.includes('already exists')) {
        return { success: false, message: `❌ A PR from '${head}' to '${base}' already exists.` };
      }
      return { success: false, message: `❌ GitHub API error: ${err.message || res.statusText}` };
    }

    const pr = (await res.json()) as GitHubPR;
    
    return {
      success: true,
      message: `✅ Pull Request created!\n\n` +
        `#${pr.number}: ${pr.title}\n` +
        `${pr.head.ref} → ${pr.base.ref}\n` +
        `🔗 ${pr.html_url}`,
      data: pr,
    };
  } catch (error) {
    const err = error as Error;
    return { success: false, message: `❌ Failed to create PR: ${err.message}` };
  }
}

/**
 * List pull requests
 */
export async function listPRs(
  owner: string,
  repo: string,
  gitConfig?: GitConfig,
  state: 'open' | 'closed' | 'all' = 'open'
): Promise<GitHubResult> {
  const token = getToken(gitConfig);
  if (!token) {
    return { success: false, message: '❌ No GitHub token. Use /github_token to set one.' };
  }

  try {
    const res = await githubFetch(`/repos/${owner}/${repo}/pulls?state=${state}&per_page=10`, token);
    
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as GitHubError;
      return { success: false, message: `❌ GitHub API error: ${err.message || res.statusText}` };
    }

    const prs = (await res.json()) as GitHubPR[];
    
    if (prs.length === 0) {
      return { success: true, message: `📋 No ${state} pull requests in ${owner}/${repo}` };
    }

    let msg = `📋 Pull Requests (${owner}/${repo})\n\n`;
    
    for (const pr of prs) {
      const stateIcon = pr.state === 'open' ? '🟢' : '🔴';
      msg += `${stateIcon} #${pr.number}: ${pr.title}\n`;
      msg += `   ${pr.head.ref} → ${pr.base.ref}\n`;
    }

    return { success: true, message: msg, data: { prs } };
  } catch (error) {
    const err = error as Error;
    return { success: false, message: `❌ Failed to list PRs: ${err.message}` };
  }
}

/**
 * Get repository info
 */
export async function getRepoInfo(
  owner: string,
  repo: string,
  gitConfig?: GitConfig
): Promise<GitHubResult> {
  const token = getToken(gitConfig);
  if (!token) {
    return { success: false, message: '❌ No GitHub token. Use /github_token to set one.' };
  }

  try {
    const res = await githubFetch(`/repos/${owner}/${repo}`, token);
    
    if (!res.ok) {
      if (res.status === 404) {
        return { success: false, message: `❌ Repository '${owner}/${repo}' not found.` };
      }
      const err = (await res.json().catch(() => ({}))) as GitHubError;
      return { success: false, message: `❌ GitHub API error: ${err.message || res.statusText}` };
    }

    const repoData = (await res.json()) as GitHubRepo & { 
      stargazers_count: number; 
      forks_count: number;
      open_issues_count: number;
      language: string | null;
    };
    
    const visibility = repoData.private ? '🔒 Private' : '🌐 Public';
    
    return {
      success: true,
      message: `📦 ${repoData.full_name}\n\n` +
        `${visibility}\n` +
        `${repoData.description || 'No description'}\n\n` +
        `⭐ ${repoData.stargazers_count} stars\n` +
        `🍴 ${repoData.forks_count} forks\n` +
        `🐛 ${repoData.open_issues_count} open issues\n` +
        `💻 ${repoData.language || 'Unknown'}\n` +
        `🌿 Default: ${repoData.default_branch}\n\n` +
        `🔗 ${repoData.html_url}`,
      data: repoData,
    };
  } catch (error) {
    const err = error as Error;
    return { success: false, message: `❌ Failed to get repo info: ${err.message}` };
  }
}

/**
 * Parse repo string (owner/repo or full URL)
 */
export function parseRepoString(input: string): { owner: string; repo: string } | null {
  // Handle full URLs
  const urlMatch = input.match(/github\.com[/:]([^/]+)\/([^/.]+)/);
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }
  
  // Handle owner/repo format
  const parts = input.split('/');
  if (parts.length === 2 && parts[0] && parts[1]) {
    return { owner: parts[0], repo: parts[1] };
  }
  
  return null;
}
