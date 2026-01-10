/**
 * GitHub → Vercel Direct Deployment Bridge
 * Deploy GitHub repositories directly to Vercel without local files
 * 
 * NOVA Framework v6.0 - VEGA + ANTARES Implementation
 * January 2026 - API-First Architecture
 * 
 * Flow:
 * 1. Fetch repo tree via GitHub API
 * 2. Detect framework from package.json
 * 3. Convert files to Vercel deployment format
 * 4. Create deployment via Vercel API
 * 5. Return preview URL
 * 
 * Benefits:
 * - No local clone required
 * - Deploy any GitHub repo directly
 * - Automatic framework detection
 * - Branch-specific previews
 */

import { createHash } from 'crypto';
import {
  GitHubAPIConfig,
  APIResult,
  TreeEntry,
  fetchRepoTree,
  fetchBlobRaw,
  getDefaultBranch,
} from './github-api';
import {
  VercelAPIConfig,
  DeploymentFile,
  DeploymentResult,
  createDeployment,
  waitForDeployment,
} from './vercel-api';

// =============================================================================
// TYPES
// =============================================================================

export interface GitHubToVercelConfig {
  github: GitHubAPIConfig;
  vercel: VercelAPIConfig;
  branch?: string;
  framework?: string;
  buildCommand?: string;
  outputDirectory?: string;
  installCommand?: string;
}

export interface FrameworkSignature {
  files: string[];
  deps: string[];
  buildCommand?: string;
  outputDirectory?: string;
}

// =============================================================================
// FRAMEWORK DETECTION
// =============================================================================

const FRAMEWORK_SIGNATURES: Record<string, FrameworkSignature> = {
  'nextjs': {
    files: ['next.config.js', 'next.config.mjs', 'next.config.ts'],
    deps: ['next'],
    outputDirectory: '.next',
  },
  'vite': {
    files: ['vite.config.ts', 'vite.config.js', 'vite.config.mjs'],
    deps: ['vite'],
    buildCommand: 'vite build',
    outputDirectory: 'dist',
  },
  'remix': {
    files: ['remix.config.js', 'remix.config.ts'],
    deps: ['@remix-run/react', '@remix-run/node'],
  },
  'astro': {
    files: ['astro.config.mjs', 'astro.config.ts', 'astro.config.js'],
    deps: ['astro'],
    outputDirectory: 'dist',
  },
  'nuxtjs': {
    files: ['nuxt.config.ts', 'nuxt.config.js'],
    deps: ['nuxt', 'nuxt3'],
    outputDirectory: '.output/public',
  },
  'sveltekit': {
    files: ['svelte.config.js', 'svelte.config.ts'],
    deps: ['@sveltejs/kit'],
    outputDirectory: 'build',
  },
  'gatsby': {
    files: ['gatsby-config.js', 'gatsby-config.ts'],
    deps: ['gatsby'],
    outputDirectory: 'public',
  },
  'angular': {
    files: ['angular.json'],
    deps: ['@angular/core'],
    outputDirectory: 'dist',
  },
  'vue': {
    files: ['vue.config.js'],
    deps: ['vue', '@vue/cli-service'],
    outputDirectory: 'dist',
  },
  'create-react-app': {
    files: [],
    deps: ['react-scripts'],
    buildCommand: 'react-scripts build',
    outputDirectory: 'build',
  },
  'solidjs': {
    files: [],
    deps: ['solid-js', 'solid-start'],
    outputDirectory: 'dist',
  },
};

/**
 * Detect framework from repository files and package.json
 */
export function detectFramework(
  tree: TreeEntry[],
  packageJson?: { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }
): { framework: string | null; config: FrameworkSignature | null } {
  const filePaths = new Set(tree.map(t => t.path));
  
  // Check config files first (most reliable)
  for (const [framework, sig] of Object.entries(FRAMEWORK_SIGNATURES)) {
    if (sig.files.some(f => filePaths.has(f))) {
      return { framework, config: sig };
    }
  }
  
  // Fall back to dependency detection
  if (packageJson) {
    const deps = { 
      ...packageJson.dependencies, 
      ...packageJson.devDependencies 
    };
    
    for (const [framework, sig] of Object.entries(FRAMEWORK_SIGNATURES)) {
      if (sig.deps.some(d => deps[d])) {
        return { framework, config: sig };
      }
    }
  }
  
  return { framework: null, config: null };
}

// =============================================================================
// FILE FILTERING
// =============================================================================

/**
 * Files/directories to skip when deploying
 */
const SKIP_PATTERNS = [
  'node_modules',
  '.git',
  '.github',
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  '.DS_Store',
  'Thumbs.db',
  '.vercel',
  '.next/cache',
  '__pycache__',
  '*.pyc',
  '.pytest_cache',
  'coverage',
  '.nyc_output',
  '.turbo',
  '.cache',
];

/**
 * Check if file should be skipped
 */
function shouldSkipFile(path: string): boolean {
  const parts = path.split('/');
  
  for (const pattern of SKIP_PATTERNS) {
    // Exact match or directory match
    if (parts.includes(pattern)) return true;
    
    // Glob pattern (simple)
    if (pattern.startsWith('*.')) {
      const ext = pattern.slice(1);
      if (path.endsWith(ext)) return true;
    }
  }
  
  return false;
}

// =============================================================================
// MAIN DEPLOYMENT FUNCTION
// =============================================================================

/**
 * Calculate SHA1 hash for Vercel
 */
function sha1(content: Buffer): string {
  return createHash('sha1').update(content).digest('hex');
}

/**
 * Deploy a GitHub repository directly to Vercel
 * No local files needed - fetches everything via API
 */
export async function deployGitHubToVercel(
  config: GitHubToVercelConfig
): Promise<APIResult<DeploymentResult & { framework?: string }>> {
  const { github, vercel } = config;
  
  // 1. Determine branch
  let branch = config.branch;
  if (!branch) {
    const defaultBranch = await getDefaultBranch(github);
    if (!defaultBranch.success || !defaultBranch.data) {
      return { success: false, message: defaultBranch.message };
    }
    branch = defaultBranch.data;
  }
  
  console.log(`[GitHub→Vercel] Fetching tree from ${github.owner}/${github.repo}@${branch}`);
  
  // 2. Fetch repository tree
  const treeResult = await fetchRepoTree(github, branch);
  if (!treeResult.success || !treeResult.data) {
    return { success: false, message: treeResult.message };
  }
  
  const tree = treeResult.data;
  const blobs = tree.filter(e => e.type === 'blob' && !shouldSkipFile(e.path));
  
  console.log(`[GitHub→Vercel] Found ${blobs.length} files to deploy`);
  
  // 3. Fetch package.json for framework detection
  let packageJson: { 
    dependencies?: Record<string, string>; 
    devDependencies?: Record<string, string>;
    name?: string;
  } | undefined;
  
  const pkgEntry = blobs.find(b => b.path === 'package.json');
  if (pkgEntry) {
    const pkgResult = await fetchBlobRaw(github, pkgEntry.sha);
    if (pkgResult.success && pkgResult.data) {
      try {
        packageJson = JSON.parse(pkgResult.data.toString('utf-8'));
      } catch {
        console.warn('[GitHub→Vercel] Failed to parse package.json');
      }
    }
  }
  
  // 4. Detect framework
  const { framework } = config.framework 
    ? { framework: config.framework }
    : detectFramework(tree, packageJson);
  
  if (framework) {
    console.log(`[GitHub→Vercel] Detected framework: ${framework}`);
  }
  
  // 5. Fetch file contents and build deployment files
  const files: DeploymentFile[] = [];
  let totalSize = 0;
  const maxFileSize = 5 * 1024 * 1024; // 5MB limit for inline upload
  
  for (const blob of blobs) {
    // Skip files that are too large
    if (blob.size && blob.size > maxFileSize) {
      console.log(`[GitHub→Vercel] Skipping large file: ${blob.path} (${blob.size} bytes)`);
      continue;
    }
    
    const contentResult = await fetchBlobRaw(github, blob.sha);
    if (!contentResult.success || !contentResult.data) {
      console.warn(`[GitHub→Vercel] Failed to fetch: ${blob.path}`);
      continue;
    }
    
    const content = contentResult.data;
    const fileSha = sha1(content);
    
    files.push({
      file: blob.path,
      sha: fileSha,
      size: content.length,
      data: content.toString('base64'),
    });
    
    totalSize += content.length;
  }
  
  console.log(`[GitHub→Vercel] Prepared ${files.length} files (${Math.round(totalSize / 1024)}KB)`);
  
  if (files.length === 0) {
    return { 
      success: false, 
      message: `❌ No deployable files found in ${github.owner}/${github.repo}` 
    };
  }
  
  // 6. Create Vercel deployment
  const projectName = packageJson?.name || github.repo;
  
  const deployResult = await createDeployment(vercel, files, {
    name: `${projectName}-preview`,
    target: 'preview',
    framework: framework || undefined,
    // Let Vercel handle the build
  });
  
  if (!deployResult.success || !deployResult.data) {
    return { success: false, message: deployResult.message };
  }
  
  // 7. Wait for deployment
  console.log(`[GitHub→Vercel] Waiting for deployment ${deployResult.data.id}...`);
  
  const finalResult = await waitForDeployment(vercel, deployResult.data.id);
  
  if (!finalResult.success || !finalResult.data) {
    return { success: false, message: finalResult.message };
  }
  
  return {
    success: true,
    message: `✅ Deployed ${github.owner}/${github.repo} to Vercel!\n\n` +
      `🌿 Branch: ${branch}\n` +
      `🚀 Framework: ${framework || 'auto-detect'}\n` +
      `📦 Files: ${files.length}\n` +
      `🔗 URL: ${finalResult.data.url}\n` +
      `📋 ID: ${finalResult.data.id}`,
    data: {
      ...finalResult.data,
      framework: framework || undefined,
    },
  };
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Parse GitHub repo string (owner/repo or owner/repo#branch)
 */
export function parseGitHubRepo(input: string): {
  owner: string;
  repo: string;
  branch?: string;
} | null {
  // Match: owner/repo or owner/repo#branch
  const regex = /^([^/]+)\/([^#]+)(?:#(.+))?$/;
  const match = regex.exec(input);
  
  if (!match) return null;
  
  return {
    owner: match[1],
    repo: match[2].replace('.git', ''),
    branch: match[3],
  };
}

/**
 * Check if string looks like a GitHub repo reference
 */
export function isGitHubRepoRef(input: string): boolean {
  return /^[a-zA-Z0-9_-]+\/[a-zA-Z0-9_.-]+(?:#[a-zA-Z0-9_.-]+)?$/.test(input);
}
