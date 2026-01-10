/**
 * Vercel REST API Client
 * Pure API-based deployments - NO CLI execution
 * 
 * NOVA Framework v6.0 - VEGA + ANTARES Implementation
 * January 2026 - API-First Architecture
 * 
 * Replaces Vercel CLI with REST API:
 * - Upload files via /v2/files
 * - Create deployments via /v13/deployments
 * - Check deployment status
 * - Manage environment variables
 * 
 * Benefits:
 * - No Vercel CLI required on VPS
 * - Faster deployments (direct API)
 * - Better error handling
 * - Reduced attack surface
 */

import { createHash } from 'crypto';
import { readFile, readdir, stat } from 'fs/promises';
import { join, relative } from 'path';

const VERCEL_API = 'https://api.vercel.com';

export interface VercelAPIConfig {
  token: string;
  teamId?: string;  // Optional team/org scope
  projectId?: string;
  projectName?: string;
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

export interface DeploymentFile {
  file: string;      // Relative path
  sha: string;       // SHA1 hash of content
  size: number;      // File size in bytes
  data?: string;     // Base64 content (for inline upload)
}

export interface DeploymentResult {
  id: string;
  url: string;
  readyState: 'QUEUED' | 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';
  target: 'preview' | 'production';
  createdAt: number;
  inspectorUrl?: string;
}

// =============================================================================
// CORE API HELPERS
// =============================================================================

/**
 * Make authenticated Vercel API request
 */
async function vercelFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {},
  teamId?: string
): Promise<{ data: T | null; error: string | null; rateLimit?: { remaining: number; reset: Date } }> {
  let url = endpoint.startsWith('http') ? endpoint : `${VERCEL_API}${endpoint}`;
  
  // Add team scope if provided
  if (teamId) {
    const separator = url.includes('?') ? '&' : '?';
    url += `${separator}teamId=${teamId}`;
  }
  
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const rateLimit = parseRateLimit(res);

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: res.statusText } })) as { 
        error?: { message?: string }; 
        message?: string 
      };
      const errorMsg = err.error?.message || err.message || `HTTP ${res.status}`;
      return { data: null, error: errorMsg, rateLimit };
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

/**
 * Calculate SHA1 hash of file content
 */
function sha1(content: Buffer): string {
  return createHash('sha1').update(content).digest('hex');
}

// =============================================================================
// FILE OPERATIONS
// =============================================================================

/**
 * Recursively collect all files from a directory
 */
async function collectFiles(
  dir: string,
  baseDir: string,
  files: DeploymentFile[] = []
): Promise<DeploymentFile[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relativePath = relative(baseDir, fullPath);
    
    // Skip common non-deployable files
    if (shouldSkipFile(entry.name, relativePath)) {
      continue;
    }
    
    if (entry.isDirectory()) {
      await collectFiles(fullPath, baseDir, files);
    } else if (entry.isFile()) {
      const content = await readFile(fullPath);
      files.push({
        file: relativePath.replace(/\\/g, '/'), // Normalize path separators
        sha: sha1(content),
        size: content.length,
        data: content.toString('base64'),
      });
    }
  }
  
  return files;
}

/**
 * Check if file should be skipped during deployment
 */
function shouldSkipFile(name: string, path: string): boolean {
  const skipNames = [
    'node_modules',
    '.git',
    '.env',
    '.env.local',
    '.env.production',
    '.DS_Store',
    'Thumbs.db',
    '.vercel',
    '.next/cache',
  ];
  
  const skipPatterns = [
    /^\.env\./,
    /\.log$/,
    /\.map$/,  // Skip source maps for smaller deployments
  ];
  
  if (skipNames.includes(name)) return true;
  if (path.includes('node_modules/')) return true;
  if (path.includes('.git/')) return true;
  
  for (const pattern of skipPatterns) {
    if (pattern.test(name)) return true;
  }
  
  return false;
}

// =============================================================================
// DEPLOYMENT OPERATIONS
// =============================================================================

/**
 * Upload a single file to Vercel
 * Required before creating deployment if file doesn't exist
 */
export async function uploadFile(
  config: VercelAPIConfig,
  content: Buffer,
  contentLength: number
): Promise<APIResult<{ sha: string }>> {
  const fileSha = sha1(content);
  
  const { error, rateLimit } = await vercelFetch<{ sha: string }>(
    '/v2/files',
    config.token,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-vercel-digest': fileSha,
        'Content-Length': contentLength.toString(),
      },
      body: content,
    },
    config.teamId
  );

  if (error) {
    // File might already exist (which is fine)
    if (error.includes('already exists') || error.includes('ALREADY_EXISTS')) {
      return { success: true, message: 'File already exists', data: { sha: fileSha }, rateLimit };
    }
    return { success: false, message: `❌ Failed to upload file: ${error}`, rateLimit };
  }

  return { success: true, message: 'File uploaded', data: { sha: fileSha }, rateLimit };
}

/**
 * Check which files need to be uploaded
 */
export async function checkMissingFiles(
  config: VercelAPIConfig,
  files: DeploymentFile[]
): Promise<APIResult<string[]>> {
  const { data, error, rateLimit } = await vercelFetch<{ missing: string[] }>(
    '/v2/files',
    config.token,
    {
      method: 'POST',
      body: JSON.stringify(files.map(f => ({ sha: f.sha, size: f.size }))),
    },
    config.teamId
  );

  if (error) {
    return { success: false, message: `❌ Failed to check files: ${error}`, rateLimit };
  }

  return { 
    success: true, 
    message: `${data!.missing.length} files need upload`,
    data: data!.missing,
    rateLimit 
  };
}

/**
 * Create a deployment via Vercel API
 */
export async function createDeployment(
  config: VercelAPIConfig,
  files: DeploymentFile[],
  options: {
    name?: string;
    target?: 'preview' | 'production';
    env?: Record<string, string>;
    buildEnv?: Record<string, string>;
    framework?: string;
    rootDirectory?: string;
  } = {}
): Promise<APIResult<DeploymentResult>> {
  // Build deployment payload
  const payload: Record<string, unknown> = {
    name: options.name || config.projectName || 'deployment',
    files: files.map(f => ({
      file: f.file,
      sha: f.sha,
      size: f.size,
      // Include data for inline upload (files < 5MB)
      ...(f.data && f.size < 5 * 1024 * 1024 ? { data: f.data } : {}),
    })),
    target: options.target || 'preview',
  };

  // Add project link if available
  if (config.projectId) {
    payload.project = config.projectId;
  }

  // Add environment variables
  if (options.env && Object.keys(options.env).length > 0) {
    payload.env = options.env;
  }

  if (options.buildEnv && Object.keys(options.buildEnv).length > 0) {
    payload.build = { env: options.buildEnv };
  }

  // Add framework hint
  if (options.framework) {
    payload.framework = options.framework;
  }

  // Add root directory if not deploying from root
  if (options.rootDirectory) {
    payload.rootDirectory = options.rootDirectory;
  }

  const { data, error, rateLimit } = await vercelFetch<{
    id: string;
    url: string;
    readyState: DeploymentResult['readyState'];
    target: 'preview' | 'production';
    createdAt: number;
    inspectorUrl?: string;
  }>(
    '/v13/deployments',
    config.token,
    { method: 'POST', body: JSON.stringify(payload) },
    config.teamId
  );

  if (error) {
    return { success: false, message: `❌ Deployment failed: ${error}`, rateLimit };
  }

  return {
    success: true,
    message: `✅ Deployment created!\n` +
      `🎯 Target: ${data!.target}\n` +
      `🔗 URL: https://${data!.url}\n` +
      `📋 ID: ${data!.id}\n` +
      `⏳ Status: ${data!.readyState}`,
    data: {
      id: data!.id,
      url: `https://${data!.url}`,
      readyState: data!.readyState,
      target: data!.target,
      createdAt: data!.createdAt,
      inspectorUrl: data!.inspectorUrl,
    },
    rateLimit,
  };
}

/**
 * Get deployment status
 */
export async function getDeploymentStatus(
  config: VercelAPIConfig,
  deploymentId: string
): Promise<APIResult<DeploymentResult>> {
  const { data, error, rateLimit } = await vercelFetch<{
    id: string;
    url: string;
    readyState: DeploymentResult['readyState'];
    target: 'preview' | 'production';
    createdAt: number;
    inspectorUrl?: string;
    errorMessage?: string;
  }>(
    `/v13/deployments/${deploymentId}`,
    config.token,
    {},
    config.teamId
  );

  if (error) {
    return { success: false, message: `❌ Failed to get status: ${error}`, rateLimit };
  }

  const statusEmoji: Record<string, string> = {
    QUEUED: '⏳',
    BUILDING: '🔨',
    READY: '✅',
    ERROR: '❌',
    CANCELED: '🚫',
  };

  let message = `${statusEmoji[data!.readyState] || '❓'} Deployment ${data!.readyState}\n`;
  message += `🔗 https://${data!.url}`;
  
  if (data!.errorMessage) {
    message += `\n❌ Error: ${data!.errorMessage}`;
  }

  return {
    success: data!.readyState !== 'ERROR',
    message,
    data: {
      id: data!.id,
      url: `https://${data!.url}`,
      readyState: data!.readyState,
      target: data!.target,
      createdAt: data!.createdAt,
      inspectorUrl: data!.inspectorUrl,
    },
    rateLimit,
  };
}

/**
 * Wait for deployment to be ready
 */
export async function waitForDeployment(
  config: VercelAPIConfig,
  deploymentId: string,
  maxWaitMs: number = 300000, // 5 minutes
  pollIntervalMs: number = 5000 // 5 seconds
): Promise<APIResult<DeploymentResult>> {
  const startTime = Date.now();
  
  while (Date.now() - startTime < maxWaitMs) {
    const status = await getDeploymentStatus(config, deploymentId);
    
    if (!status.success || !status.data) {
      return status;
    }
    
    if (status.data.readyState === 'READY') {
      return {
        success: true,
        message: `✅ Deployment ready!\n🔗 ${status.data.url}`,
        data: status.data,
      };
    }
    
    if (status.data.readyState === 'ERROR' || status.data.readyState === 'CANCELED') {
      return {
        success: false,
        message: `❌ Deployment ${status.data.readyState.toLowerCase()}`,
        data: status.data,
      };
    }
    
    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollIntervalMs));
  }
  
  return {
    success: false,
    message: `⏱️ Deployment timed out after ${maxWaitMs / 1000}s`,
  };
}

// =============================================================================
// HIGH-LEVEL DEPLOYMENT FUNCTION
// =============================================================================

/**
 * Deploy a directory to Vercel via API
 * Complete workflow: collect files → upload missing → create deployment → wait
 */
export async function deployDirectory(
  config: VercelAPIConfig,
  directory: string,
  options: {
    target?: 'preview' | 'production';
    name?: string;
    env?: Record<string, string>;
    buildEnv?: Record<string, string>;
    framework?: string;
    wait?: boolean;
  } = {}
): Promise<APIResult<DeploymentResult>> {
  // 1. Collect all files
  console.log(`[Vercel API] Collecting files from ${directory}...`);
  
  let files: DeploymentFile[];
  try {
    const dirStat = await stat(directory);
    if (!dirStat.isDirectory()) {
      return { success: false, message: `❌ Not a directory: ${directory}` };
    }
    files = await collectFiles(directory, directory);
  } catch (error) {
    return { success: false, message: `❌ Failed to read directory: ${(error as Error).message}` };
  }
  
  if (files.length === 0) {
    return { success: false, message: `❌ No files found in ${directory}` };
  }
  
  console.log(`[Vercel API] Found ${files.length} files`);
  
  // 2. Check which files need upload
  const missingCheck = await checkMissingFiles(config, files);
  if (!missingCheck.success) {
    return { success: false, message: missingCheck.message };
  }
  
  const missingFiles = missingCheck.data || [];
  console.log(`[Vercel API] ${missingFiles.length} files need upload`);
  
  // 3. Upload missing files
  for (const sha of missingFiles) {
    const file = files.find(f => f.sha === sha);
    if (file && file.data) {
      const content = Buffer.from(file.data, 'base64');
      const uploadResult = await uploadFile(config, content, file.size);
      if (!uploadResult.success) {
        console.warn(`[Vercel API] Failed to upload ${file.file}: ${uploadResult.message}`);
      }
    }
  }
  
  // 4. Create deployment
  console.log(`[Vercel API] Creating deployment...`);
  const deployment = await createDeployment(config, files, {
    name: options.name,
    target: options.target || 'preview',
    env: options.env,
    buildEnv: options.buildEnv,
    framework: options.framework,
  });
  
  if (!deployment.success || !deployment.data) {
    return deployment;
  }
  
  // 5. Wait for deployment if requested
  if (options.wait !== false) {
    console.log(`[Vercel API] Waiting for deployment...`);
    return waitForDeployment(config, deployment.data.id);
  }
  
  return deployment;
}

// =============================================================================
// PROJECT MANAGEMENT
// =============================================================================

/**
 * List projects
 */
export async function listProjects(
  config: VercelAPIConfig,
  limit: number = 20
): Promise<APIResult<Array<{ id: string; name: string; framework: string | null }>>> {
  const { data, error, rateLimit } = await vercelFetch<{
    projects: Array<{ id: string; name: string; framework: string | null }>;
  }>(
    `/v9/projects?limit=${limit}`,
    config.token,
    {},
    config.teamId
  );

  if (error) {
    return { success: false, message: `❌ Failed to list projects: ${error}`, rateLimit };
  }

  let message = `📦 Vercel Projects (${data!.projects.length})\n\n`;
  for (const project of data!.projects) {
    message += `• ${project.name}${project.framework ? ` [${project.framework}]` : ''}\n`;
  }

  return { success: true, message, data: data!.projects, rateLimit };
}

/**
 * Get project by name or ID
 */
export async function getProject(
  config: VercelAPIConfig,
  nameOrId: string
): Promise<APIResult<{ id: string; name: string; framework: string | null; link?: { type: string; repo: string } }>> {
  const { data, error, rateLimit } = await vercelFetch<{
    id: string;
    name: string;
    framework: string | null;
    link?: { type: string; repo: string };
  }>(
    `/v9/projects/${nameOrId}`,
    config.token,
    {},
    config.teamId
  );

  if (error) {
    return { success: false, message: `❌ Project not found: ${error}`, rateLimit };
  }

  return {
    success: true,
    message: `📦 ${data!.name}\n` +
      `ID: ${data!.id}\n` +
      `Framework: ${data!.framework || 'auto-detect'}\n` +
      (data!.link ? `Repo: ${data!.link.repo}` : ''),
    data: data ?? undefined,
    rateLimit,
  };
}

// =============================================================================
// ENVIRONMENT VARIABLES
// =============================================================================

/**
 * Add environment variable to project
 */
export async function addEnvVar(
  config: VercelAPIConfig,
  projectId: string,
  key: string,
  value: string,
  target: ('production' | 'preview' | 'development')[] = ['production', 'preview']
): Promise<APIResult<{ id: string }>> {
  const { data, error, rateLimit } = await vercelFetch<{ id: string }>(
    `/v10/projects/${projectId}/env`,
    config.token,
    {
      method: 'POST',
      body: JSON.stringify({
        key,
        value,
        target,
        type: 'encrypted',
      }),
    },
    config.teamId
  );

  if (error) {
    return { success: false, message: `❌ Failed to add env var: ${error}`, rateLimit };
  }

  return {
    success: true,
    message: `✅ Added ${key} to ${target.join(', ')}`,
    data: data ?? undefined,
    rateLimit,
  };
}

/**
 * List environment variables for project
 */
export async function listEnvVars(
  config: VercelAPIConfig,
  projectId: string
): Promise<APIResult<Array<{ key: string; target: string[]; id: string }>>> {
  const { data, error, rateLimit } = await vercelFetch<{
    envs: Array<{ key: string; target: string[]; id: string }>;
  }>(
    `/v9/projects/${projectId}/env`,
    config.token,
    {},
    config.teamId
  );

  if (error) {
    return { success: false, message: `❌ Failed to list env vars: ${error}`, rateLimit };
  }

  let message = `🔐 Environment Variables\n\n`;
  for (const env of data!.envs) {
    message += `• ${env.key} → ${env.target.join(', ')}\n`;
  }

  return { success: true, message, data: data!.envs, rateLimit };
}

