/**
 * GitHub REST API Client
 * Pure API-based git operations - NO CLI execution
 * 
 * NOVA Framework v6.0 - VEGA + ANTARES Implementation
 * January 2026 - API-First Architecture
 * 
 * Replaces git CLI commands with GitHub REST API:
 * - Create/update files via Contents API
 * - Commit multiple files via Git Database API (blobs → tree → commit → ref)
 * - Create branches via Refs API
 * - Create PRs via Pulls API
 * 
 * Benefits:
 * - No git CLI required on VPS
 * - No local clone needed for simple operations
 * - Reduced attack surface
 * - Works with any file system state
 */

const GITHUB_API = 'https://api.github.com';
const API_VERSION = '2022-11-28';

export interface GitHubAPIConfig {
  token: string;
  owner: string;
  repo: string;
}

export interface APIResult<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  rateLimit?: {
    remaining: number;
    reset: Date;
  };
}

export interface FileChange {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'base64';
}

export interface CommitResult {
  sha: string;
  url: string;
  htmlUrl: string;
  message: string;
}

export interface BranchInfo {
  name: string;
  sha: string;
  protected: boolean;
}

// =============================================================================
// CORE API HELPERS
// =============================================================================

/**
 * Make authenticated GitHub API request
 */
async function githubFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; rateLimit?: { remaining: number; reset: Date } }> {
  const url = endpoint.startsWith('http') ? endpoint : `${GITHUB_API}${endpoint}`;
  
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': API_VERSION,
        'User-Agent': 'NOVA-Agent/6.0',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const rateLimit = parseRateLimit(res);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
      return { 
        data: null, 
        error: err.message || `HTTP ${res.status}`,
        rateLimit 
      };
    }

    const data = await res.json() as T;
    return { data, error: null, rateLimit };
  } catch (error) {
    return { data: null, error: (error as Error).message };
  }
}

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

// =============================================================================
// REPOSITORY OPERATIONS
// =============================================================================

/**
 * Get repository default branch
 */
export async function getDefaultBranch(config: GitHubAPIConfig): Promise<APIResult<string>> {
  const { data, error, rateLimit } = await githubFetch<{ default_branch: string }>(
    `/repos/${config.owner}/${config.repo}`,
    config.token
  );

  if (error) {
    return { success: false, message: `❌ Failed to get repo info: ${error}`, rateLimit };
  }

  return { 
    success: true, 
    message: `Default branch: ${data!.default_branch}`,
    data: data!.default_branch,
    rateLimit 
  };
}

/**
 * Get branch reference (SHA)
 */
export async function getBranchRef(
  config: GitHubAPIConfig, 
  branch: string
): Promise<APIResult<{ sha: string; url: string }>> {
  const { data, error, rateLimit } = await githubFetch<{ object: { sha: string; url: string } }>(
    `/repos/${config.owner}/${config.repo}/git/refs/heads/${branch}`,
    config.token
  );

  if (error) {
    return { success: false, message: `❌ Branch '${branch}' not found: ${error}`, rateLimit };
  }

  return { 
    success: true, 
    message: `Branch ${branch}: ${data!.object.sha.slice(0, 7)}`,
    data: { sha: data!.object.sha, url: data!.object.url },
    rateLimit 
  };
}

/**
 * Create a new branch from a base branch
 */
export async function createBranch(
  config: GitHubAPIConfig,
  newBranch: string,
  baseBranch: string
): Promise<APIResult<BranchInfo>> {
  // Get base branch SHA
  const baseRef = await getBranchRef(config, baseBranch);
  if (!baseRef.success || !baseRef.data) {
    return { success: false, message: baseRef.message, rateLimit: baseRef.rateLimit };
  }

  // Create new branch ref
  const { data, error, rateLimit } = await githubFetch<{ ref: string; object: { sha: string } }>(
    `/repos/${config.owner}/${config.repo}/git/refs`,
    config.token,
    {
      method: 'POST',
      body: JSON.stringify({
        ref: `refs/heads/${newBranch}`,
        sha: baseRef.data.sha,
      }),
    }
  );

  if (error) {
    if (error.includes('Reference already exists')) {
      return { success: false, message: `❌ Branch '${newBranch}' already exists`, rateLimit };
    }
    return { success: false, message: `❌ Failed to create branch: ${error}`, rateLimit };
  }

  return {
    success: true,
    message: `✅ Created branch: ${newBranch}\n🔗 From: ${baseBranch} (${baseRef.data.sha.slice(0, 7)})`,
    data: { name: newBranch, sha: data!.object.sha, protected: false },
    rateLimit,
  };
}

// =============================================================================
// FILE OPERATIONS (Contents API - Single File)
// =============================================================================

/**
 * Get file content and SHA
 */
export async function getFileContent(
  config: GitHubAPIConfig,
  path: string,
  branch?: string
): Promise<APIResult<{ content: string; sha: string; size: number }>> {
  const query = branch ? `?ref=${branch}` : '';
  const { data, error, rateLimit } = await githubFetch<{ 
    content: string; 
    sha: string; 
    size: number;
    encoding: string;
  }>(
    `/repos/${config.owner}/${config.repo}/contents/${path}${query}`,
    config.token
  );

  if (error) {
    return { success: false, message: `❌ File not found: ${path}`, rateLimit };
  }

  // Decode base64 content
  const content = data!.encoding === 'base64' 
    ? Buffer.from(data!.content, 'base64').toString('utf-8')
    : data!.content;

  return {
    success: true,
    message: `📄 ${path} (${data!.size} bytes)`,
    data: { content, sha: data!.sha, size: data!.size },
    rateLimit,
  };
}

/**
 * Create or update a single file (Contents API)
 * Good for simple single-file updates
 */
export async function createOrUpdateFile(
  config: GitHubAPIConfig,
  path: string,
  content: string,
  message: string,
  branch: string,
  existingSha?: string
): Promise<APIResult<CommitResult>> {
  // If no SHA provided, try to get existing file SHA
  let sha = existingSha;
  if (!sha) {
    const existing = await getFileContent(config, path, branch);
    if (existing.success && existing.data) {
      sha = existing.data.sha;
    }
  }

  const body: Record<string, unknown> = {
    message,
    content: Buffer.from(content).toString('base64'),
    branch,
  };

  if (sha) {
    body.sha = sha; // Required for updates
  }

  const { data, error, rateLimit } = await githubFetch<{
    commit: { sha: string; html_url: string; message: string };
    content: { sha: string };
  }>(
    `/repos/${config.owner}/${config.repo}/contents/${path}`,
    config.token,
    { method: 'PUT', body: JSON.stringify(body) }
  );

  if (error) {
    return { success: false, message: `❌ Failed to ${sha ? 'update' : 'create'} file: ${error}`, rateLimit };
  }

  return {
    success: true,
    message: `✅ ${sha ? 'Updated' : 'Created'}: ${path}\n📝 ${message}\n🔗 ${data!.commit.html_url}`,
    data: {
      sha: data!.commit.sha,
      url: data!.commit.html_url,
      htmlUrl: data!.commit.html_url,
      message: data!.commit.message,
    },
    rateLimit,
  };
}

/**
 * Delete a file
 */
export async function deleteFile(
  config: GitHubAPIConfig,
  path: string,
  message: string,
  branch: string,
  sha: string
): Promise<APIResult<CommitResult>> {
  const { data, error, rateLimit } = await githubFetch<{
    commit: { sha: string; html_url: string; message: string };
  }>(
    `/repos/${config.owner}/${config.repo}/contents/${path}`,
    config.token,
    {
      method: 'DELETE',
      body: JSON.stringify({ message, sha, branch }),
    }
  );

  if (error) {
    return { success: false, message: `❌ Failed to delete file: ${error}`, rateLimit };
  }

  return {
    success: true,
    message: `🗑️ Deleted: ${path}\n📝 ${message}`,
    data: {
      sha: data!.commit.sha,
      url: data!.commit.html_url,
      htmlUrl: data!.commit.html_url,
      message: data!.commit.message,
    },
    rateLimit,
  };
}

// =============================================================================
// REPOSITORY TREE OPERATIONS (For Vercel Deployment)
// =============================================================================

export interface TreeEntry {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
  url: string;
}

/**
 * Fetch entire repository tree in one API call
 * Used for GitHub → Vercel direct deployment
 */
export async function fetchRepoTree(
  config: GitHubAPIConfig,
  branch: string = 'main'
): Promise<APIResult<TreeEntry[]>> {
  const { data, error, rateLimit } = await githubFetch<{
    sha: string;
    url: string;
    tree: TreeEntry[];
    truncated: boolean;
  }>(
    `/repos/${config.owner}/${config.repo}/git/trees/${branch}?recursive=1`,
    config.token
  );

  if (error) {
    return { success: false, message: `❌ Failed to fetch repo tree: ${error}`, rateLimit };
  }

  if (data!.truncated) {
    console.warn('[GitHub API] Tree was truncated - repo may be too large');
  }

  return {
    success: true,
    message: `📂 Fetched ${data!.tree.length} entries from ${branch}`,
    data: data!.tree,
    rateLimit,
  };
}

/**
 * Fetch raw blob content by SHA
 * More efficient for large files than Contents API
 */
export async function fetchBlobContent(
  config: GitHubAPIConfig,
  sha: string
): Promise<APIResult<{ content: string; size: number }>> {
  const { data, error, rateLimit } = await githubFetch<{
    content: string;
    encoding: string;
    size: number;
  }>(
    `/repos/${config.owner}/${config.repo}/git/blobs/${sha}`,
    config.token
  );

  if (error) {
    return { success: false, message: `❌ Failed to fetch blob: ${error}`, rateLimit };
  }

  // Content is always base64 encoded from blobs API
  const content = Buffer.from(data!.content, 'base64').toString('utf-8');

  return {
    success: true,
    message: `📄 Blob ${sha.slice(0, 7)} (${data!.size} bytes)`,
    data: { content, size: data!.size },
    rateLimit,
  };
}

/**
 * Get raw blob content as Buffer (for binary files)
 */
export async function fetchBlobRaw(
  config: GitHubAPIConfig,
  sha: string
): Promise<APIResult<Buffer>> {
  const { data, error, rateLimit } = await githubFetch<{
    content: string;
    encoding: string;
    size: number;
  }>(
    `/repos/${config.owner}/${config.repo}/git/blobs/${sha}`,
    config.token
  );

  if (error) {
    return { success: false, message: `❌ Failed to fetch blob: ${error}`, rateLimit };
  }

  return {
    success: true,
    message: `📄 Blob ${sha.slice(0, 7)} (${data!.size} bytes)`,
    data: Buffer.from(data!.content, 'base64'),
    rateLimit,
  };
}

// =============================================================================
// MULTI-FILE COMMIT (Git Database API)
// =============================================================================

/**
 * Create a blob for file content
 */
async function createBlob(
  config: GitHubAPIConfig,
  content: string,
  encoding: 'utf-8' | 'base64' = 'utf-8'
): Promise<APIResult<{ sha: string }>> {
  const { data, error, rateLimit } = await githubFetch<{ sha: string }>(
    `/repos/${config.owner}/${config.repo}/git/blobs`,
    config.token,
    {
      method: 'POST',
      body: JSON.stringify({ content, encoding }),
    }
  );

  if (error) {
    return { success: false, message: `❌ Failed to create blob: ${error}`, rateLimit };
  }

  return { success: true, message: 'Blob created', data: data ?? undefined, rateLimit };
}

/**
 * Create a tree with multiple file changes
 */
async function createTree(
  config: GitHubAPIConfig,
  baseTreeSha: string,
  files: Array<{ path: string; sha: string; mode?: string }>
): Promise<APIResult<{ sha: string }>> {
  const tree = files.map(f => ({
    path: f.path,
    mode: f.mode || '100644', // Regular file
    type: 'blob',
    sha: f.sha,
  }));

  const { data, error, rateLimit } = await githubFetch<{ sha: string }>(
    `/repos/${config.owner}/${config.repo}/git/trees`,
    config.token,
    {
      method: 'POST',
      body: JSON.stringify({ base_tree: baseTreeSha, tree }),
    }
  );

  if (error) {
    return { success: false, message: `❌ Failed to create tree: ${error}`, rateLimit };
  }

  return { success: true, message: 'Tree created', data: data ?? undefined, rateLimit };
}

/**
 * Create a commit
 */
async function createCommit(
  config: GitHubAPIConfig,
  message: string,
  treeSha: string,
  parentSha: string
): Promise<APIResult<{ sha: string; html_url: string }>> {
  const { data, error, rateLimit } = await githubFetch<{ sha: string; html_url: string }>(
    `/repos/${config.owner}/${config.repo}/git/commits`,
    config.token,
    {
      method: 'POST',
      body: JSON.stringify({
        message,
        tree: treeSha,
        parents: [parentSha],
      }),
    }
  );

  if (error) {
    return { success: false, message: `❌ Failed to create commit: ${error}`, rateLimit };
  }

  return { success: true, message: 'Commit created', data: data ?? undefined, rateLimit };
}

/**
 * Update branch reference to point to new commit
 */
async function updateRef(
  config: GitHubAPIConfig,
  branch: string,
  commitSha: string
): Promise<APIResult<{ sha: string }>> {
  const { data, error, rateLimit } = await githubFetch<{ object: { sha: string } }>(
    `/repos/${config.owner}/${config.repo}/git/refs/heads/${branch}`,
    config.token,
    {
      method: 'PATCH',
      body: JSON.stringify({ sha: commitSha, force: false }),
    }
  );

  if (error) {
    return { success: false, message: `❌ Failed to update ref: ${error}`, rateLimit };
  }

  return { success: true, message: 'Ref updated', data: { sha: data!.object.sha }, rateLimit };
}

/**
 * Commit multiple files in a single commit via Git Database API
 * This is the main function for multi-file commits without git CLI
 */
export async function commitMultipleFiles(
  config: GitHubAPIConfig,
  files: FileChange[],
  message: string,
  branch: string
): Promise<APIResult<CommitResult>> {
  // 1. Get current branch SHA
  const branchRef = await getBranchRef(config, branch);
  if (!branchRef.success || !branchRef.data) {
    return { success: false, message: branchRef.message, rateLimit: branchRef.rateLimit };
  }

  // 2. Get the tree SHA from the commit
  const { data: commitData, error: commitError } = await githubFetch<{ tree: { sha: string } }>(
    `/repos/${config.owner}/${config.repo}/git/commits/${branchRef.data.sha}`,
    config.token
  );

  if (commitError || !commitData) {
    return { success: false, message: `❌ Failed to get commit: ${commitError}` };
  }

  // 3. Create blobs for each file
  const blobResults: Array<{ path: string; sha: string }> = [];
  
  for (const file of files) {
    const content = file.encoding === 'base64' 
      ? file.content 
      : Buffer.from(file.content).toString('base64');
    
    const blobResult = await createBlob(config, content, 'base64');
    if (!blobResult.success || !blobResult.data) {
      return { success: false, message: `❌ Failed to create blob for ${file.path}` };
    }
    
    blobResults.push({ path: file.path, sha: blobResult.data.sha });
  }

  // 4. Create new tree
  const treeResult = await createTree(config, commitData.tree.sha, blobResults);
  if (!treeResult.success || !treeResult.data) {
    return { success: false, message: treeResult.message };
  }

  // 5. Create commit
  const newCommit = await createCommit(config, message, treeResult.data.sha, branchRef.data.sha);
  if (!newCommit.success || !newCommit.data) {
    return { success: false, message: newCommit.message };
  }

  // 6. Update branch ref
  const refResult = await updateRef(config, branch, newCommit.data.sha);
  if (!refResult.success) {
    return { success: false, message: refResult.message };
  }

  return {
    success: true,
    message: `✅ Committed ${files.length} files to ${branch}\n` +
      `📝 ${message}\n` +
      `🔗 ${newCommit.data.html_url}`,
    data: {
      sha: newCommit.data.sha,
      url: newCommit.data.html_url,
      htmlUrl: newCommit.data.html_url,
      message,
    },
  };
}

// =============================================================================
// PULL REQUEST OPERATIONS
// =============================================================================

export interface PRCreateOptions {
  title: string;
  body?: string;
  head: string;  // Branch with changes
  base: string;  // Target branch (usually main)
  draft?: boolean;
}

export interface PRInfo {
  number: number;
  title: string;
  htmlUrl: string;
  state: string;
  head: string;
  base: string;
  mergeable?: boolean;
}

/**
 * Create a pull request
 */
export async function createPullRequest(
  config: GitHubAPIConfig,
  options: PRCreateOptions
): Promise<APIResult<PRInfo>> {
  const { data, error, rateLimit } = await githubFetch<{
    number: number;
    title: string;
    html_url: string;
    state: string;
    head: { ref: string };
    base: { ref: string };
    mergeable: boolean | null;
  }>(
    `/repos/${config.owner}/${config.repo}/pulls`,
    config.token,
    {
      method: 'POST',
      body: JSON.stringify({
        title: options.title,
        body: options.body || '',
        head: options.head,
        base: options.base,
        draft: options.draft || false,
      }),
    }
  );

  if (error) {
    if (error.includes('already exists')) {
      return { success: false, message: `❌ PR already exists for ${options.head} → ${options.base}`, rateLimit };
    }
    return { success: false, message: `❌ Failed to create PR: ${error}`, rateLimit };
  }

  return {
    success: true,
    message: `✅ PR #${data!.number} created!\n` +
      `📋 ${data!.title}\n` +
      `🔀 ${options.head} → ${options.base}\n` +
      `🔗 ${data!.html_url}`,
    data: {
      number: data!.number,
      title: data!.title,
      htmlUrl: data!.html_url,
      state: data!.state,
      head: data!.head.ref,
      base: data!.base.ref,
      mergeable: data!.mergeable ?? undefined,
    },
    rateLimit,
  };
}

/**
 * Merge a pull request
 */
export async function mergePullRequest(
  config: GitHubAPIConfig,
  prNumber: number,
  commitTitle?: string,
  mergeMethod: 'merge' | 'squash' | 'rebase' = 'squash'
): Promise<APIResult<{ sha: string; merged: boolean }>> {
  const { data, error, rateLimit } = await githubFetch<{ sha: string; merged: boolean }>(
    `/repos/${config.owner}/${config.repo}/pulls/${prNumber}/merge`,
    config.token,
    {
      method: 'PUT',
      body: JSON.stringify({
        commit_title: commitTitle,
        merge_method: mergeMethod,
      }),
    }
  );

  if (error) {
    return { success: false, message: `❌ Failed to merge PR: ${error}`, rateLimit };
  }

  return {
    success: true,
    message: `✅ PR #${prNumber} merged!\n🔀 Method: ${mergeMethod}\n📝 ${data?.sha.slice(0, 7) || 'merged'}`,
    data: data ?? undefined,
    rateLimit,
  };
}

// =============================================================================
// HIGH-LEVEL WORKFLOW FUNCTIONS
// =============================================================================

/**
 * Complete workflow: Create branch → Commit files → Create PR
 * All via API, no git CLI needed
 */
export async function createBranchCommitAndPR(
  config: GitHubAPIConfig,
  options: {
    branchName: string;
    baseBranch: string;
    files: FileChange[];
    commitMessage: string;
    prTitle: string;
    prBody?: string;
  }
): Promise<APIResult<{ branch: string; commit: CommitResult; pr: PRInfo }>> {
  // 1. Create branch
  const branchResult = await createBranch(config, options.branchName, options.baseBranch);
  if (!branchResult.success) {
    // Branch might already exist, try to use it
    const existingBranch = await getBranchRef(config, options.branchName);
    if (!existingBranch.success) {
      return { success: false, message: branchResult.message };
    }
  }

  // 2. Commit files to the new branch
  const commitResult = await commitMultipleFiles(
    config,
    options.files,
    options.commitMessage,
    options.branchName
  );
  if (!commitResult.success || !commitResult.data) {
    return { success: false, message: commitResult.message };
  }

  // 3. Create PR
  const prResult = await createPullRequest(config, {
    title: options.prTitle,
    body: options.prBody,
    head: options.branchName,
    base: options.baseBranch,
  });
  if (!prResult.success || !prResult.data) {
    return { success: false, message: prResult.message };
  }

  return {
    success: true,
    message: `✅ Complete workflow executed!\n\n` +
      `🌿 Branch: ${options.branchName}\n` +
      `📝 Commit: ${commitResult.data.sha.slice(0, 7)}\n` +
      `🔀 PR #${prResult.data.number}: ${prResult.data.title}\n` +
      `🔗 ${prResult.data.htmlUrl}`,
    data: {
      branch: options.branchName,
      commit: commitResult.data,
      pr: prResult.data,
    },
  };
}

