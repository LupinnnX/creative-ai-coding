/**
 * Autonomy Module - Main Exports
 * 
 * NOVA Framework v6.0 - Agent Autonomy System
 * 
 * Features:
 * - Git operations (commit, push, branch)
 * - GitHub API (repos, PRs, forks)
 * - Preview deployments (Surge, Vercel, Netlify, etc.)
 * - Sandboxed command execution
 * - Centralized configuration
 */

// Configuration
export {
  AutonomyConfig,
  AutonomyLevel,
  GitConfig,
  PreviewConfig,
  ExecConfig,
  SafetyConfig,
  PreviewProvider,
  VercelConfig,
  DEFAULT_AUTONOMY_CONFIG,
  DEFAULT_VERCEL_CONFIG,
  DEFAULT_EXEC_ALLOWLIST,
  DEFAULT_EXEC_BLOCKLIST,
  AUTONOMY_PRESETS,
  mergeConfig,
  applyPreset,
  serializeConfig,
  deserializeConfig,
} from './config';

// Git Operations
export {
  GitResult,
  gitConfig,
  gitStatus,
  gitBranch,
  gitCommit,
  gitPush,
  gitDiff,
  gitPull,
  ensureGitIdentity,
} from './git-operations';

// GitHub API
export {
  GitHubResult,
  GitHubRepo,
  GitHubPR,
  GitIdentity,
  getUser as ghGetUser,
  getUserEmails as ghGetUserEmails,
  getUserIdentity as ghGetUserIdentity,
  listRepos as ghListRepos,
  createRepo as ghCreateRepo,
  forkRepo as ghForkRepo,
  createPR as ghCreatePR,
  listPRs as ghListPRs,
  getRepoInfo as ghGetRepoInfo,
  parseRepoString as ghParseRepo,
} from './github-api';

// Preview Deployment
export {
  DeployResult,
  VercelDeployResult,
  listProviders,
  deploy,
  quickDeploy,
  deployVercel,
  buildVercelCommand,
  getVercelToken,
  getVercelSetupInfo,
  formatVercelEnvVars,
  getSurgeSetupInfo,
  getSurgeCredentials,
  scanForDeployableContent,
  formatScanResults,
} from './preview-deploy';

// Self-Healing Deployment (ARCTURUS)
export {
  DeployErrorCategory,
  DiagnosisResult,
  FixResult,
  SelfHealingResult,
  diagnoseError,
  attemptAutoFix,
  formatArcturusAnalysis,
  selfHealingDeploy,
} from './self-healing-deploy';

// Command Execution
export {
  ExecResult,
  execSandbox,
  execSequence,
  quickExec,
} from './exec-sandbox';

// Command Sequence Parser
export {
  ParsedCommand,
  ParsedSequence,
  parseCommandSequence,
  extractCommandsFromMessage,
  validateCommands,
  formatCommandSequence,
} from './command-sequence-parser';

// Smart Execution (Full Autonomy Mode)
export {
  SmartExecOptions,
  SmartExecResult,
  FULL_AUTONOMY_ALLOWLIST,
  ABSOLUTE_BLOCKLIST,
  COMMAND_TEMPLATES,
  CommandTemplate,
  smartExecSingle,
  smartExecSequence,
  execTemplate,
  listTemplates,
  findProjectRoot,
  findDirectory,
} from './smart-exec';
