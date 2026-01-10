/**
 * Autonomy Configuration System
 * Centralized configuration for agent autonomy features
 * 
 * NOVA Framework v6.0 - POLARIS + VEGA Design
 */

export type AutonomyLevel = 'off' | 'low' | 'medium' | 'high' | 'full';

export type PreviewProvider = 'surge' | 'vercel' | 'netlify' | 'cloudflare' | 'github-pages';

/**
 * Vercel-specific configuration for sophisticated deployments
 * Supports preview/production environments, env vars, debug mode, and more
 */
export interface VercelConfig {
  // Authentication
  token?: string;              // VERCEL_TOKEN (per-user)
  useDefaultToken: boolean;    // Use server's VERCEL_TOKEN if no user token
  
  // Project Configuration
  projectId?: string;          // Linked Vercel project ID
  projectName?: string;        // Project name for display
  orgId?: string;              // Team/org ID (--scope)
  
  // Deployment Options
  defaultTarget: 'preview' | 'production';
  debug: boolean;              // --debug flag for verbose output
  archive: boolean;            // --archive=tgz for large projects (1000+ files)
  prebuilt: boolean;           // Use --prebuilt (local build first)
  noWait: boolean;             // --no-wait for async deployment
  force: boolean;              // --force to skip confirmation
  
  // Environment Variables (stored for injection)
  buildEnv: Record<string, string>;    // --build-env KEY=value
  runtimeEnv: Record<string, string>;  // --env KEY=value
  
  // Metadata & Regions
  meta: Record<string, string>;        // --meta KEY=value
  regions: string[];                   // --regions sfo1,iad1
  
  // Custom Domain
  customDomain?: string;
}

/**
 * Default Vercel configuration
 */
export const DEFAULT_VERCEL_CONFIG: VercelConfig = {
  useDefaultToken: true,
  defaultTarget: 'preview',
  debug: false,
  archive: false,
  prebuilt: false,
  noWait: false,
  force: false,
  buildEnv: {},
  runtimeEnv: {},
  meta: {},
  regions: [],
};

export interface GitConfig {
  enabled: boolean;
  allowPush: boolean;
  protectedBranches: string[];
  autoCommit: boolean;
  commitPrefix: string;
  userName?: string;
  userEmail?: string;
  // GitHub authentication
  ghToken?: string;        // Per-user GitHub token (overrides env)
  useDefaultToken: boolean; // Use server's GH_TOKEN if no user token
}

export interface PreviewConfig {
  enabled: boolean;
  provider: PreviewProvider;
  autoDeploy: boolean;
  customDomain?: string;
  buildDir: string;
  // Surge.sh authentication (per-user)
  surgeLogin?: string;      // User's Surge email
  surgeToken?: string;      // User's Surge token
  useDefaultSurge: boolean; // Use server's SURGE_LOGIN/SURGE_TOKEN if no user credentials
  // Vercel configuration (per-user)
  vercel: VercelConfig;
}

export interface ExecConfig {
  enabled: boolean;
  timeout: number;
  allowlist: string[];
  blocklist: string[];
}

export interface SafetyConfig {
  requireConfirmation: boolean;
  maxFilesPerCommit: number;
  maxLinesChanged: number;
  dryRunFirst: boolean;
}

export interface AutonomyConfig {
  level: AutonomyLevel;
  git: GitConfig;
  preview: PreviewConfig;
  exec: ExecConfig;
  safety: SafetyConfig;
}

/**
 * Default safe command allowlist
 */
export const DEFAULT_EXEC_ALLOWLIST = [
  'npm', 'yarn', 'pnpm', 'bun',
  'node', 'npx', 'tsx', 'ts-node',
  'git', 'gh',
  'ls', 'cat', 'pwd', 'echo', 'head', 'tail', 'wc',
  'grep', 'find', 'which', 'env',
  'curl', 'wget',
  'docker', 'docker-compose',
  'make', 'cargo', 'go', 'python', 'pip',
];

/**
 * Commands that should never be executed
 */
export const DEFAULT_EXEC_BLOCKLIST = [
  'rm -rf /',
  'rm -rf /*',
  'sudo rm',
  'sudo su',
  'chmod 777',
  'mkfs',
  'dd if=',
  ':(){:|:&};:',
  '> /dev/sda',
  'mv /* ',
];

/**
 * Default autonomy configuration
 */
export const DEFAULT_AUTONOMY_CONFIG: AutonomyConfig = {
  level: 'medium',
  git: {
    enabled: true,
    allowPush: false,
    protectedBranches: ['main', 'master', 'production', 'release'],
    autoCommit: false,
    commitPrefix: '[AI] ',
    useDefaultToken: true, // Use server's GH_TOKEN by default
  },
  preview: {
    enabled: true,
    provider: 'vercel',
    autoDeploy: false,
    buildDir: '',  // Empty = auto-detect
    useDefaultSurge: true, // Use server's SURGE_LOGIN/SURGE_TOKEN by default
    vercel: DEFAULT_VERCEL_CONFIG,
  },
  exec: {
    enabled: true,
    timeout: 30000,
    allowlist: DEFAULT_EXEC_ALLOWLIST,
    blocklist: DEFAULT_EXEC_BLOCKLIST,
  },
  safety: {
    requireConfirmation: true,
    maxFilesPerCommit: 50,
    maxLinesChanged: 5000,
    dryRunFirst: false,
  },
};

/**
 * Autonomy level presets
 */
export const AUTONOMY_PRESETS: Record<AutonomyLevel, Partial<AutonomyConfig>> = {
  off: {
    git: { ...DEFAULT_AUTONOMY_CONFIG.git, enabled: false, allowPush: false },
    preview: { ...DEFAULT_AUTONOMY_CONFIG.preview, enabled: false },
    exec: { ...DEFAULT_AUTONOMY_CONFIG.exec, enabled: false },
    safety: { ...DEFAULT_AUTONOMY_CONFIG.safety, requireConfirmation: true },
  },
  low: {
    git: { ...DEFAULT_AUTONOMY_CONFIG.git, enabled: true, allowPush: false, autoCommit: false },
    preview: { ...DEFAULT_AUTONOMY_CONFIG.preview, enabled: true, autoDeploy: false },
    exec: { ...DEFAULT_AUTONOMY_CONFIG.exec, enabled: true },
    safety: { ...DEFAULT_AUTONOMY_CONFIG.safety, requireConfirmation: true },
  },
  medium: {
    git: { ...DEFAULT_AUTONOMY_CONFIG.git, enabled: true, allowPush: false, autoCommit: true },
    preview: { ...DEFAULT_AUTONOMY_CONFIG.preview, enabled: true, autoDeploy: false },
    exec: { ...DEFAULT_AUTONOMY_CONFIG.exec, enabled: true },
    safety: { ...DEFAULT_AUTONOMY_CONFIG.safety, requireConfirmation: false },
  },
  high: {
    git: { ...DEFAULT_AUTONOMY_CONFIG.git, enabled: true, allowPush: true, autoCommit: true },
    preview: { ...DEFAULT_AUTONOMY_CONFIG.preview, enabled: true, autoDeploy: true },
    exec: { ...DEFAULT_AUTONOMY_CONFIG.exec, enabled: true },
    safety: { ...DEFAULT_AUTONOMY_CONFIG.safety, requireConfirmation: false, dryRunFirst: false },
  },
  full: {
    git: { ...DEFAULT_AUTONOMY_CONFIG.git, enabled: true, allowPush: true, autoCommit: true, protectedBranches: [] },
    preview: { ...DEFAULT_AUTONOMY_CONFIG.preview, enabled: true, autoDeploy: true },
    exec: { ...DEFAULT_AUTONOMY_CONFIG.exec, enabled: true, blocklist: [] },
    safety: { ...DEFAULT_AUTONOMY_CONFIG.safety, requireConfirmation: false, maxFilesPerCommit: 1000, maxLinesChanged: 50000 },
  },
};

/**
 * Merge partial config with defaults
 */
export function mergeConfig(partial: Partial<AutonomyConfig>): AutonomyConfig {
  return {
    level: partial.level ?? DEFAULT_AUTONOMY_CONFIG.level,
    git: { ...DEFAULT_AUTONOMY_CONFIG.git, ...partial.git },
    preview: { ...DEFAULT_AUTONOMY_CONFIG.preview, ...partial.preview },
    exec: { ...DEFAULT_AUTONOMY_CONFIG.exec, ...partial.exec },
    safety: { ...DEFAULT_AUTONOMY_CONFIG.safety, ...partial.safety },
  };
}

/**
 * Apply autonomy level preset
 */
export function applyPreset(level: AutonomyLevel): AutonomyConfig {
  const preset = AUTONOMY_PRESETS[level];
  return mergeConfig({ level, ...preset });
}

/**
 * Serialize config for storage in session metadata
 */
export function serializeConfig(config: AutonomyConfig): string {
  return JSON.stringify(config);
}

/**
 * Deserialize config from session metadata
 */
export function deserializeConfig(json: string | undefined): AutonomyConfig {
  if (!json) return DEFAULT_AUTONOMY_CONFIG;
  try {
    const parsed = JSON.parse(json);
    return mergeConfig(parsed);
  } catch {
    return DEFAULT_AUTONOMY_CONFIG;
  }
}
