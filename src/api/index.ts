/**
 * API Module - Main Exports
 * 
 * NOVA Framework v6.0 - API-First Architecture
 * January 2026
 * 
 * Pure API-based operations replacing CLI execution:
 * - GitHub REST API (commits, branches, PRs)
 * - Vercel REST API (deployments)
 * - Supabase MCP (database operations)
 * 
 * Benefits:
 * - No CLI tools required on VPS
 * - Reduced attack surface
 * - Better error handling
 * - Faster execution
 */

// GitHub API
export {
  GitHubAPIConfig,
  APIResult,
  FileChange,
  CommitResult,
  BranchInfo,
  PRCreateOptions,
  PRInfo,
  TreeEntry,
  // Repository operations
  getDefaultBranch,
  getBranchRef,
  createBranch,
  // File operations
  getFileContent,
  createOrUpdateFile,
  deleteFile,
  // Repository tree (for Vercel deployment)
  fetchRepoTree,
  fetchBlobContent,
  fetchBlobRaw,
  // Multi-file commit
  commitMultipleFiles,
  // Pull requests
  createPullRequest,
  mergePullRequest,
  // High-level workflows
  createBranchCommitAndPR,
} from './github-api';

// Vercel API
export {
  VercelAPIConfig,
  DeploymentFile,
  DeploymentResult,
  // File operations
  uploadFile,
  checkMissingFiles,
  // Deployment
  createDeployment,
  getDeploymentStatus,
  waitForDeployment,
  deployDirectory,
  // Project management
  listProjects as listVercelProjects,
  getProject as getVercelProject,
  // Environment variables
  addEnvVar,
  listEnvVars,
} from './vercel-api';

// Supabase MCP
export {
  SupabaseMCPConfig,
  SupabaseFeature,
  MCPResult,
  TableInfo,
  QueryResult,
  MigrationResult,
  EdgeFunctionInfo,
  SupabaseMCPClient,
  createSupabaseMCPClient,
  getSupabaseSetupInfo,
} from './supabase-mcp';

// API Command Helpers (for use by existing commands)
export {
  getGitHubConfigFromConversation,
  getVercelConfigFromSession,
  collectChangedFilesForAPI,
  getCurrentBranch,
  // Git operations via API
  apiGitCommit,
  apiGitPush,
  apiGitBranch,
  apiCreatePR,
  // Vercel operations via API
  apiVercelDeploy,
  // GitHub → Vercel direct deployment
  apiDeployGitHubRepo,
  isGitHubRepoRef,
  parseGitHubRepo,
  // Supabase operations
  setupSupabase,
  listSupabaseTables,
  executeSupabaseQuery,
} from '../handlers/api-commands';

// GitHub → Vercel Bridge
export {
  GitHubToVercelConfig,
  FrameworkSignature,
  deployGitHubToVercel,
  detectFramework,
} from './github-to-vercel';

