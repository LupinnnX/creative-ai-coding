/**
 * Preview Deployment Module
 * Free hosting integrations for live previews
 * 
 * NOVA Framework v6.0 - VEGA Research Implementation
 * 
 * Supported Providers:
 * - Surge.sh (FREE, token-based auth for CI/CD)
 * - Vercel (FREE tier, requires VERCEL_TOKEN)
 * - Netlify (FREE tier, requires NETLIFY_AUTH_TOKEN)
 * - Cloudflare Pages (FREE, requires CLOUDFLARE_API_TOKEN)
 * - GitHub Pages (FREE, requires GH_TOKEN)
 * 
 * Surge.sh Setup (December 2025):
 * 1. Install: npm install -g surge
 * 2. Login: surge login (interactive, do once locally)
 * 3. Get token: surge token
 * 4. Set env: SURGE_LOGIN=your@email.com, SURGE_TOKEN=xxxxx
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { access } from 'fs/promises';
import { join, basename, resolve } from 'path';
import { PreviewConfig, PreviewProvider, VercelConfig, DEFAULT_VERCEL_CONFIG } from './config';

const execAsync = promisify(exec);

export interface DeployResult {
  success: boolean;
  message: string;
  url?: string;
  provider: PreviewProvider;
}

/**
 * Provider configurations with CLI commands and requirements
 */
const PROVIDERS: Record<PreviewProvider, {
  name: string;
  cli: string;
  installCmd: string;
  deployCmd: (dir: string, domain?: string) => string;
  urlPattern: RegExp;
  requiresAuth: boolean;
  authEnvVar?: string;
  authEnvVar2?: string; // Secondary env var (e.g., SURGE_LOGIN)
  freeFeatures: string;
}> = {
  surge: {
    name: 'Surge.sh',
    cli: 'surge',
    installCmd: 'npm install -g surge',
    deployCmd: (dir, domain) => domain 
      ? `surge ${dir} ${domain}.surge.sh`
      : `surge ${dir}`,
    urlPattern: /https?:\/\/[^\s]+\.surge\.sh/,
    requiresAuth: true, // Changed: requires token for CI/CD
    authEnvVar: 'SURGE_TOKEN',
    authEnvVar2: 'SURGE_LOGIN',
    freeFeatures: 'Unlimited projects, custom subdomains, instant deploy',
  },
  vercel: {
    name: 'Vercel',
    cli: 'vercel',
    installCmd: 'npm install -g vercel',
    deployCmd: (dir) => `vercel ${dir} --yes --prod`,
    urlPattern: /https?:\/\/[^\s]+\.vercel\.app/,
    requiresAuth: true,
    authEnvVar: 'VERCEL_TOKEN',
    freeFeatures: '100 deployments/day, preview URLs, serverless functions',
  },
  netlify: {
    name: 'Netlify',
    cli: 'netlify',
    installCmd: 'npm install -g netlify-cli',
    deployCmd: (dir) => `netlify deploy --dir=${dir} --prod`,
    urlPattern: /https?:\/\/[^\s]+\.netlify\.app/,
    requiresAuth: true,
    authEnvVar: 'NETLIFY_AUTH_TOKEN',
    freeFeatures: '300 build minutes/month, forms, identity',
  },
  cloudflare: {
    name: 'Cloudflare Pages',
    cli: 'wrangler',
    installCmd: 'npm install -g wrangler',
    deployCmd: (dir) => `wrangler pages deploy ${dir}`,
    urlPattern: /https?:\/\/[^\s]+\.pages\.dev/,
    requiresAuth: true,
    authEnvVar: 'CLOUDFLARE_API_TOKEN',
    freeFeatures: 'Unlimited requests, global CDN, web analytics',
  },
  'github-pages': {
    name: 'GitHub Pages',
    cli: 'gh-pages',
    installCmd: 'npm install -g gh-pages',
    deployCmd: (dir) => `gh-pages -d ${dir}`,
    urlPattern: /https?:\/\/[^\s]+\.github\.io/,
    requiresAuth: true,
    authEnvVar: 'GH_TOKEN',
    freeFeatures: 'Free for public repos, custom domains',
  },
};


/**
 * Check if a CLI tool is installed
 */
async function checkCli(cli: string): Promise<boolean> {
  try {
    await execAsync(`which ${cli} || where ${cli}`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Auto-detect build output directory or check if current dir is deployable
 * Returns '.' if no build dir found but current dir has index.html
 */
async function detectBuildDir(cwd: string): Promise<string | null> {
  // Common build output directories
  const candidates = ['dist', 'build', 'out', 'public', '.next', '_site', 'www', '_build'];
  
  for (const dir of candidates) {
    try {
      await access(join(cwd, dir));
      return dir;
    } catch { /* continue */ }
  }
  
  // Check if current directory has index.html (deployable as-is)
  try {
    await access(join(cwd, 'index.html'));
    return '.';
  } catch { /* continue */ }
  
  // No deployable directory found
  return null;
}

/**
 * List available directories that could be deployed
 */
async function listDeployableDirs(cwd: string): Promise<string[]> {
  const { stat } = await import('fs/promises');
  const deployable: string[] = [];
  
  // Check for index.html in root
  try {
    await access(join(cwd, 'index.html'));
    deployable.push('. (current directory)');
  } catch { /* ignore */ }
  
  // Check common build directories
  const candidates = ['dist', 'build', 'out', 'public', '.next', '_site', 'www', '_build'];
  for (const dir of candidates) {
    try {
      const dirPath = join(cwd, dir);
      const stats = await stat(dirPath);
      if (stats.isDirectory()) {
        deployable.push(dir);
      }
    } catch { /* ignore */ }
  }
  
  return deployable;
}

/**
 * Scan project for deployable content with intelligent detection
 * Enhanced to find website files correctly for Vercel/Surge deployment
 * Returns detailed info about what can be deployed
 */
export async function scanForDeployableContent(cwd: string): Promise<{
  recommended: string | null;
  folders: Array<{
    path: string;
    hasIndex: boolean;
    hasAssets: boolean;
    hasVercelConfig: boolean;
    hasPackageJson: boolean;
    fileCount: number;
    totalSize: number;
    webFiles: string[];
    framework: string | null;
    reason: string;
    score: number;
  }>;
  suggestions: string[];
  projectType: 'static' | 'framework' | 'unknown';
  detectedFramework: string | null;
}> {
  const { readdir, stat, readFile: fsReadFile } = await import('fs/promises');
  const folders: Array<{
    path: string;
    hasIndex: boolean;
    hasAssets: boolean;
    hasVercelConfig: boolean;
    hasPackageJson: boolean;
    fileCount: number;
    totalSize: number;
    webFiles: string[];
    framework: string | null;
    reason: string;
    score: number;
  }> = [];
  const suggestions: string[] = [];
  let projectType: 'static' | 'framework' | 'unknown' = 'unknown';
  let detectedFramework: string | null = null;
  
  // Web file extensions for detection
  const WEB_EXTENSIONS = ['.html', '.htm', '.css', '.js', '.jsx', '.ts', '.tsx', '.json', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.eot'];
  const STATIC_EXTENSIONS = ['.html', '.htm', '.css', '.js', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico'];
  
  // Helper to analyze folder content deeply
  async function analyzeFolder(folderPath: string): Promise<{
    hasIndex: boolean;
    hasAssets: boolean;
    hasVercelConfig: boolean;
    hasPackageJson: boolean;
    fileCount: number;
    totalSize: number;
    webFiles: string[];
    framework: string | null;
  } | null> {
    try {
      const fullPath = folderPath === '.' ? cwd : join(cwd, folderPath);
      const stats = await stat(fullPath);
      if (!stats.isDirectory()) return null;
      
      const files = await readdir(fullPath);
      const webFiles: string[] = [];
      let totalSize = 0;
      let framework: string | null = null;
      
      // Check for index files
      const hasIndex = files.some(f => 
        f === 'index.html' || f === 'index.htm' || 
        f === '200.html' || f === '404.html' // SPA fallbacks
      );
      
      // Check for assets
      const hasAssets = files.some(f => 
        f.endsWith('.css') || f.endsWith('.js') || 
        f === 'assets' || f === 'static' || f === 'css' || f === 'js' ||
        f === '_next' || f === 'chunks' || f === 'media'
      );
      
      // Check for Vercel config
      const hasVercelConfig = files.some(f => f === 'vercel.json' || f === '.vercel');
      
      // Check for package.json (indicates it might be a framework project root)
      const hasPackageJson = files.some(f => f === 'package.json');
      
      // Analyze web files
      for (const file of files) {
        const ext = file.substring(file.lastIndexOf('.')).toLowerCase();
        if (WEB_EXTENSIONS.includes(ext) || STATIC_EXTENSIONS.includes(ext)) {
          webFiles.push(file);
          try {
            const fileStat = await stat(join(fullPath, file));
            totalSize += fileStat.size;
          } catch { /* ignore */ }
        }
      }
      
      // Detect framework from folder structure
      if (files.includes('_next')) framework = 'Next.js';
      else if (files.includes('_nuxt')) framework = 'Nuxt';
      else if (files.includes('_astro')) framework = 'Astro';
      else if (files.includes('.svelte-kit')) framework = 'SvelteKit';
      else if (files.includes('__sapper__')) framework = 'Sapper';
      
      return { 
        hasIndex, 
        hasAssets, 
        hasVercelConfig, 
        hasPackageJson,
        fileCount: files.length, 
        totalSize,
        webFiles,
        framework
      };
    } catch {
      return null;
    }
  }
  
  // Calculate deployment score (higher = better candidate)
  function calculateScore(analysis: NonNullable<Awaited<ReturnType<typeof analyzeFolder>>>, path: string): number {
    let score = 0;
    
    // Has index.html is most important
    if (analysis.hasIndex) score += 100;
    
    // Has assets (CSS/JS)
    if (analysis.hasAssets) score += 50;
    
    // Has Vercel config
    if (analysis.hasVercelConfig) score += 30;
    
    // Web files count
    score += Math.min(analysis.webFiles.length * 2, 40);
    
    // Prefer build directories over root
    if (['dist', 'build', 'out', '.next', 'public'].includes(path)) score += 20;
    
    // Penalize root if it has package.json (likely source, not build)
    if (path === '.' && analysis.hasPackageJson) score -= 50;
    
    // Framework detection bonus
    if (analysis.framework) score += 25;
    
    return score;
  }
  
  // Check root directory
  const rootAnalysis = await analyzeFolder('.');
  if (rootAnalysis) {
    const score = calculateScore(rootAnalysis, '.');
    if (rootAnalysis.hasIndex || rootAnalysis.webFiles.length > 0) {
      folders.push({
        path: '.',
        ...rootAnalysis,
        reason: rootAnalysis.hasIndex ? 'Has index.html in root' : 'Has web files in root',
        score,
      });
    }
  }
  
  // Check common build output directories (expanded list)
  const buildDirs = [
    { path: 'dist', reason: 'Standard build output (Vite, Webpack, Rollup, Parcel)' },
    { path: 'build', reason: 'Create React App / generic build output' },
    { path: 'out', reason: 'Next.js static export / Gatsby' },
    { path: '.next', reason: 'Next.js build output (SSR/SSG)' },
    { path: '.output/public', reason: 'Nuxt 3 static output' },
    { path: '.nuxt/dist', reason: 'Nuxt 2 build output' },
    { path: 'public', reason: 'Static assets / Hugo / Eleventy' },
    { path: '_site', reason: 'Jekyll / 11ty / Bridgetown build output' },
    { path: 'www', reason: 'Cordova / Ionic / Capacitor build output' },
    { path: '_build', reason: 'Sphinx / documentation build' },
    { path: 'docs', reason: 'Documentation folder / GitHub Pages' },
    { path: 'site', reason: 'MkDocs build output' },
    { path: 'dist/spa', reason: 'Quasar SPA build' },
    { path: 'dist/pwa', reason: 'Quasar PWA build' },
    { path: '.svelte-kit/output', reason: 'SvelteKit build output' },
    { path: 'storybook-static', reason: 'Storybook build output' },
    { path: '.docusaurus/build', reason: 'Docusaurus build output' },
    { path: 'coverage/lcov-report', reason: 'Test coverage report' },
    { path: 'dist/client', reason: 'Vite SSR client build' },
    { path: 'dist/browser', reason: 'Angular browser build' },
  ];
  
  for (const { path: dirPath, reason } of buildDirs) {
    const analysis = await analyzeFolder(dirPath);
    if (analysis && (analysis.hasIndex || analysis.webFiles.length > 0 || analysis.hasAssets)) {
      const score = calculateScore(analysis, dirPath);
      folders.push({
        path: dirPath,
        ...analysis,
        reason,
        score,
      });
    }
  }
  
  // Check for package.json to detect framework and suggest build commands
  try {
    const pkgPath = join(cwd, 'package.json');
    const pkgContent = await fsReadFile(pkgPath, 'utf-8');
    const pkg = JSON.parse(pkgContent);
    
    // Detect framework from dependencies
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    if (deps.next) {
      detectedFramework = 'Next.js';
      projectType = 'framework';
      suggestions.push('Next.js: Run `npm run build` then deploy `.next` or `out` folder');
      if (!folders.some(f => f.path === '.next' || f.path === 'out')) {
        suggestions.push('For static export: `next build && next export`');
      }
    } else if (deps.nuxt) {
      detectedFramework = 'Nuxt';
      projectType = 'framework';
      suggestions.push('Nuxt: Run `npm run generate` for static, deploy `.output/public`');
    } else if (deps.vite || deps['@vitejs/plugin-react'] || deps['@vitejs/plugin-vue']) {
      detectedFramework = 'Vite';
      projectType = 'framework';
      suggestions.push('Vite: Run `npm run build`, deploy `dist/`');
    } else if (deps['react-scripts']) {
      detectedFramework = 'Create React App';
      projectType = 'framework';
      suggestions.push('CRA: Run `npm run build`, deploy `build/`');
    } else if (deps.gatsby) {
      detectedFramework = 'Gatsby';
      projectType = 'framework';
      suggestions.push('Gatsby: Run `gatsby build`, deploy `public/`');
    } else if (deps.astro || deps['@astrojs/node']) {
      detectedFramework = 'Astro';
      projectType = 'framework';
      suggestions.push('Astro: Run `npm run build`, deploy `dist/`');
    } else if (deps.svelte || deps['@sveltejs/kit']) {
      detectedFramework = 'Svelte/SvelteKit';
      projectType = 'framework';
      suggestions.push('SvelteKit: Run `npm run build`, deploy `build/` or `.svelte-kit/output`');
    } else if (deps['@angular/core']) {
      detectedFramework = 'Angular';
      projectType = 'framework';
      suggestions.push('Angular: Run `ng build`, deploy `dist/<project-name>/browser`');
    } else if (deps.vue) {
      detectedFramework = 'Vue';
      projectType = 'framework';
      suggestions.push('Vue: Run `npm run build`, deploy `dist/`');
    } else if (deps.remix || deps['@remix-run/react']) {
      detectedFramework = 'Remix';
      projectType = 'framework';
      suggestions.push('Remix: Vercel auto-detects, just deploy root');
    } else if (deps.solid || deps['solid-js']) {
      detectedFramework = 'Solid';
      projectType = 'framework';
      suggestions.push('Solid: Run `npm run build`, deploy `dist/`');
    }
    
    // Generic build script detection
    if (pkg.scripts?.build && !detectedFramework) {
      suggestions.push('Run `npm run build` to create build output');
    }
    if (pkg.scripts?.['build:prod']) {
      suggestions.push('Run `npm run build:prod` for production build');
    }
    if (pkg.scripts?.generate) {
      suggestions.push('Run `npm run generate` for static site generation');
    }
    if (pkg.scripts?.export) {
      suggestions.push('Run `npm run export` for static export');
    }
    
  } catch { 
    // No package.json - likely static site
    if (folders.some(f => f.hasIndex)) {
      projectType = 'static';
    }
  }
  
  // Check for vercel.json in root for framework detection
  try {
    const vercelConfigPath = join(cwd, 'vercel.json');
    const vercelConfig = await fsReadFile(vercelConfigPath, 'utf-8');
    const config = JSON.parse(vercelConfig);
    if (config.framework) {
      detectedFramework = config.framework;
      suggestions.push(`Vercel config detected: ${config.framework}`);
    }
    if (config.outputDirectory) {
      suggestions.push(`Vercel output directory: ${config.outputDirectory}`);
    }
  } catch { /* no vercel.json */ }
  
  // Sort folders by score (highest first)
  folders.sort((a, b) => b.score - a.score);
  
  // Determine recommended folder
  let recommended: string | null = null;
  
  if (folders.length > 0) {
    // Use highest scored folder
    recommended = folders[0].path;
    
    // Special case: if root has package.json and a build folder exists with higher score, prefer build
    if (recommended === '.' && folders.length > 1) {
      const buildFolder = folders.find(f => f.path !== '.' && f.score > 50);
      if (buildFolder) {
        recommended = buildFolder.path;
      }
    }
  }
  
  // Add Vercel-specific suggestions
  if (detectedFramework) {
    suggestions.push(`Vercel auto-detects ${detectedFramework} - you can deploy root directly`);
  }
  
  return { recommended, folders, suggestions, projectType, detectedFramework };
}

/**
 * Format scan results for display (enhanced for Vercel)
 */
export function formatScanResults(scan: Awaited<ReturnType<typeof scanForDeployableContent>>): string {
  let msg = '🔍 Deployable Content Scan\n\n';
  
  // Show detected framework
  if (scan.detectedFramework) {
    msg += `🚀 Framework: ${scan.detectedFramework}\n`;
    msg += `📦 Type: ${scan.projectType === 'framework' ? 'Framework Project' : 'Static Site'}\n\n`;
  }
  
  if (scan.folders.length === 0) {
    msg += '❌ No deployable folders found.\n\n';
    
    if (scan.suggestions.length > 0) {
      msg += '💡 Suggestions:\n';
      scan.suggestions.forEach(s => msg += `  • ${s}\n`);
    } else {
      msg += '💡 To deploy:\n';
      msg += '  • Create an index.html file\n';
      msg += '  • Or run your build command (npm run build)\n';
      msg += '  • Or specify any folder: /preview <folder>\n';
    }
    
    return msg;
  }
  
  if (scan.recommended) {
    msg += `✅ Recommended: /preview ${scan.recommended}\n\n`;
  }
  
  msg += '📁 Deployable folders:\n\n';
  
  for (const folder of scan.folders) {
    const indexIcon = folder.hasIndex ? '✅' : '⚠️';
    const assetsIcon = folder.hasAssets ? '📦' : '';
    const vercelIcon = folder.hasVercelConfig ? '▲' : '';
    const frameworkBadge = folder.framework ? `[${folder.framework}]` : '';
    
    msg += `${indexIcon} ${folder.path} ${assetsIcon}${vercelIcon} ${frameworkBadge}\n`;
    msg += `   ${folder.reason}\n`;
    msg += `   ${folder.fileCount} files`;
    if (folder.totalSize > 0) {
      const sizeKB = Math.round(folder.totalSize / 1024);
      msg += ` (~${sizeKB > 1024 ? Math.round(sizeKB / 1024) + 'MB' : sizeKB + 'KB'})`;
    }
    if (!folder.hasIndex) msg += ' (no index.html)';
    msg += `\n`;
    
    // Show some web files
    if (folder.webFiles.length > 0) {
      const preview = folder.webFiles.slice(0, 5).join(', ');
      const more = folder.webFiles.length > 5 ? ` +${folder.webFiles.length - 5} more` : '';
      msg += `   📄 ${preview}${more}\n`;
    }
    msg += '\n';
  }
  
  if (scan.suggestions.length > 0) {
    msg += '💡 Tips:\n';
    scan.suggestions.forEach(s => msg += `  • ${s}\n`);
    msg += '\n';
  }
  
  msg += '📋 Commands:\n';
  msg += '  /preview           - Deploy to Vercel (preview)\n';
  msg += '  /preview <folder>  - Deploy specific folder\n';
  msg += '  /preview_prod      - Deploy to production\n';
  msg += '  /vercel_debug on   - Enable verbose output';
  
  return msg;
}

/**
 * Generate a unique subdomain based on project name
 */
function generateSubdomain(cwd: string): string {
  const projectName = basename(cwd)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 30);
  
  const timestamp = Date.now().toString(36).slice(-4);
  return `${projectName}-${timestamp}`;
}

/**
 * List available preview providers with their status
 */
export async function listProviders(): Promise<string> {
  let msg = '🚀 Preview Deployment Providers\n\n';
  
  for (const [key, provider] of Object.entries(PROVIDERS)) {
    const installed = await checkCli(provider.cli);
    
    // Check auth - for Surge, need both SURGE_LOGIN and SURGE_TOKEN
    let hasAuth = !provider.requiresAuth;
    if (provider.requiresAuth) {
      if (provider.authEnvVar2) {
        // Surge needs both login and token
        hasAuth = !!process.env[provider.authEnvVar || ''] && !!process.env[provider.authEnvVar2];
      } else {
        hasAuth = !!process.env[provider.authEnvVar || ''];
      }
    }
    
    const status = installed && hasAuth ? '✅' : installed ? '🔑' : '📦';
    
    msg += `${status} ${provider.name} (${key})\n`;
    msg += `   ${provider.freeFeatures}\n`;
    
    if (!installed) {
      msg += `   Install: ${provider.installCmd}\n`;
    } else if (provider.requiresAuth && !hasAuth) {
      if (provider.authEnvVar2) {
        msg += `   Need: ${provider.authEnvVar} + ${provider.authEnvVar2}\n`;
      } else {
        msg += `   Need: ${provider.authEnvVar}\n`;
      }
    }
    msg += '\n';
  }
  
  msg += 'Legend: ✅ Ready | 🔑 Need auth | 📦 Need install\n\n';
  msg += '💡 Surge setup: /surge-setup';
  
  return msg;
}

/**
 * Get Surge.sh configuration status and setup instructions
 */
export function getSurgeSetupInfo(previewConfig?: PreviewConfig): string {
  // Check user credentials first, then server defaults
  const hasUserToken = !!previewConfig?.surgeToken;
  const hasUserLogin = !!previewConfig?.surgeLogin;
  const hasServerToken = !!process.env.SURGE_TOKEN;
  const hasServerLogin = !!process.env.SURGE_LOGIN;
  const useDefault = previewConfig?.useDefaultSurge !== false;
  
  const isConfigured = (hasUserToken && hasUserLogin) || 
                       (useDefault && hasServerToken && hasServerLogin);
  
  let msg = '🌊 Surge.sh Configuration\n\n';
  
  msg += `Status: ${isConfigured ? '✅ Configured' : '❌ Not configured'}\n\n`;
  
  msg += `📱 Your Credentials:\n`;
  msg += `  Email: ${hasUserLogin ? '✅ Set' : '❌ Not set'}\n`;
  msg += `  Token: ${hasUserToken ? '✅ Set' : '❌ Not set'}\n\n`;
  
  msg += `🖥️ Server Defaults:\n`;
  msg += `  Email: ${hasServerLogin ? '✅ Available' : '❌ Not available'}\n`;
  msg += `  Token: ${hasServerToken ? '✅ Available' : '❌ Not available'}\n`;
  msg += `  Use server: ${useDefault ? '✅ Yes' : '❌ No'}\n\n`;
  
  if (!isConfigured) {
    msg += '📋 Setup via Telegram:\n\n';
    msg += '/surge_setup <email> <token>\n\n';
    msg += 'Example:\n';
    msg += '/surge_setup me@email.com abc123token\n\n';
    msg += '📋 Get your token:\n';
    msg += '1. npm install -g surge\n';
    msg += '2. surge login\n';
    msg += '3. surge token (copy output)\n\n';
    msg += '📋 Other commands:\n';
    msg += '/surge_setup clear - Remove your credentials\n';
    msg += '/surge_setup default on - Use server credentials\n';
    msg += '/surge_setup default off - Require personal credentials';
  } else {
    msg += '✅ Ready to deploy!\n\n';
    msg += 'Use: /preview [build-dir]\n';
    msg += 'Example: /preview dist';
  }
  
  return msg;
}

/**
 * Get effective Surge credentials (user > server)
 */
export function getSurgeCredentials(previewConfig?: PreviewConfig): { login?: string; token?: string } {
  // User credentials take priority
  if (previewConfig?.surgeLogin && previewConfig?.surgeToken) {
    return {
      login: previewConfig.surgeLogin,
      token: previewConfig.surgeToken,
    };
  }
  
  // Fall back to server defaults if allowed
  if (previewConfig?.useDefaultSurge !== false) {
    return {
      login: process.env.SURGE_LOGIN,
      token: process.env.SURGE_TOKEN,
    };
  }
  
  return {};
}

/**
 * Deploy to preview provider
 */
export async function deploy(
  cwd: string,
  config: PreviewConfig
): Promise<DeployResult> {
  const provider = PROVIDERS[config.provider];
  
  if (!provider) {
    return {
      success: false,
      message: `❌ Unknown provider: ${config.provider}\n\nAvailable: ${Object.keys(PROVIDERS).join(', ')}`,
      provider: config.provider,
    };
  }
  
  // Check if CLI is installed
  const installed = await checkCli(provider.cli);
  if (!installed) {
    return {
      success: false,
      message: `❌ ${provider.name} CLI not installed.\n\nInstall: ${provider.installCmd}`,
      provider: config.provider,
    };
  }
  
  // Check auth if required
  if (provider.requiresAuth) {
    if (config.provider === 'surge') {
      // Surge uses per-user credentials from config
      const creds = getSurgeCredentials(config);
      if (!creds.login || !creds.token) {
        return {
          success: false,
          message: `❌ ${provider.name} requires authentication.\n\nSetup: /surge_setup <email> <token>\n\nGet token: surge login && surge token`,
          provider: config.provider,
        };
      }
    } else if (provider.authEnvVar2) {
      // Other providers with two env vars
      if (!process.env[provider.authEnvVar || ''] || !process.env[provider.authEnvVar2]) {
        return {
          success: false,
          message: `❌ ${provider.name} requires authentication.\n\nSet: ${provider.authEnvVar} and ${provider.authEnvVar2}`,
          provider: config.provider,
        };
      }
    } else if (provider.authEnvVar && !process.env[provider.authEnvVar]) {
      return {
        success: false,
        message: `❌ ${provider.name} requires authentication.\n\nSet: ${provider.authEnvVar}`,
        provider: config.provider,
      };
    }
  }
  
  // Detect or use configured build directory
  let buildDir = config.buildDir;
  
  // If buildDir is '.' or empty, use current directory
  if (buildDir === '.' || buildDir === './') {
    buildDir = '.';
  } else if (!buildDir) {
    // Auto-detect
    const detected = await detectBuildDir(cwd);
    if (!detected) {
      const available = await listDeployableDirs(cwd);
      let msg = `❌ No deployable directory found.\n\n`;
      
      if (available.length > 0) {
        msg += `📁 Available directories:\n`;
        available.forEach(d => msg += `  • ${d}\n`);
        msg += `\nUse: /preview <directory>`;
      } else {
        msg += `💡 Options:\n`;
        msg += `  • Run your build: npm run build\n`;
        msg += `  • Deploy current dir: /preview .\n`;
        msg += `  • Specify folder: /preview public`;
      }
      
      return {
        success: false,
        message: msg,
        provider: config.provider,
      };
    }
    buildDir = detected;
  }
  
  const fullBuildPath = resolve(buildDir === '.' ? cwd : join(cwd, buildDir));
  
  // Check if build directory exists
  try {
    await access(fullBuildPath);
  } catch {
    const available = await listDeployableDirs(cwd);
    let msg = `❌ Directory not found: ${buildDir}\n\n`;
    
    if (available.length > 0) {
      msg += `📁 Available directories:\n`;
      available.forEach(d => msg += `  • ${d}\n`);
      msg += `\nUse: /preview <directory>`;
    } else {
      msg += `💡 Options:\n`;
      msg += `  • Run your build: npm run build\n`;
      msg += `  • Deploy current dir: /preview .\n`;
      msg += `  • Create index.html in your project`;
    }
    
    return {
      success: false,
      message: msg,
      provider: config.provider,
    };
  }
  
  // Generate domain for Surge
  const domain = config.customDomain || (config.provider === 'surge' ? generateSubdomain(cwd) : undefined);
  
  try {
    const cmd = provider.deployCmd(fullBuildPath, domain);
    console.log(`[Preview] Deploying with: ${cmd}`);
    
    // Build environment with auth credentials
    const deployEnv = { ...process.env };
    
    // For Surge, use per-user credentials from config
    if (config.provider === 'surge') {
      const creds = getSurgeCredentials(config);
      if (creds.login) deployEnv.SURGE_LOGIN = creds.login;
      if (creds.token) deployEnv.SURGE_TOKEN = creds.token;
    }
    
    const { stdout, stderr } = await execAsync(cmd, {
      cwd,
      timeout: 120000, // 2 minute timeout
      env: deployEnv,
    });
    
    const output = stdout + stderr;
    
    // Extract URL from output
    const urlMatch = output.match(provider.urlPattern) || output.match(/https?:\/\/[^\s]+/);
    const url = urlMatch ? urlMatch[0] : undefined;
    
    // For Surge, construct URL if not found
    const finalUrl = url || (config.provider === 'surge' && domain ? `https://${domain}.surge.sh` : undefined);
    
    return {
      success: true,
      message: `✅ Deployed to ${provider.name}!\n\n🔗 ${finalUrl || 'URL in output'}\n\n${output.slice(0, 500)}`,
      url: finalUrl,
      provider: config.provider,
    };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      message: `❌ Deploy failed: ${err.message}`,
      provider: config.provider,
    };
  }
}

/**
 * Quick deploy with Surge (zero config)
 */
export async function quickDeploy(cwd: string, buildDir?: string): Promise<DeployResult> {
  // Auto-detect if not specified
  let dir = buildDir;
  if (!dir) {
    const detected = await detectBuildDir(cwd);
    dir = detected || undefined; // Let deploy() handle the error with suggestions
  }
  
  const config: PreviewConfig = {
    enabled: true,
    provider: 'surge',
    autoDeploy: false,
    buildDir: dir || '',
    useDefaultSurge: true,
    vercel: DEFAULT_VERCEL_CONFIG,
  };
  
  return deploy(cwd, config);
}

// =============================================================================
// VERCEL SOPHISTICATED DEPLOYMENT SYSTEM
// NOVA Framework v6.0 - POLARIS + VEGA + ANTARES Implementation
// =============================================================================

/**
 * Extended deploy result for Vercel with additional metadata
 */
export interface VercelDeployResult extends DeployResult {
  inspectorUrl?: string;
  deploymentId?: string;
  target?: 'preview' | 'production';
  debugOutput?: string;
}

/**
 * Get effective Vercel token (user > server)
 */
export function getVercelToken(vercelConfig?: VercelConfig): string | undefined {
  // User token takes priority
  if (vercelConfig?.token) {
    return vercelConfig.token;
  }
  
  // Fall back to server default if allowed
  if (vercelConfig?.useDefaultToken !== false) {
    return process.env.VERCEL_TOKEN;
  }
  
  return undefined;
}

/**
 * Build Vercel CLI command with all options
 */
export function buildVercelCommand(
  buildDir: string,
  vercelConfig: VercelConfig,
  target: 'preview' | 'production' = 'preview'
): string {
  const args: string[] = ['vercel', buildDir];
  
  // Always skip confirmation prompts
  args.push('--yes');
  
  // Target environment
  if (target === 'production') {
    args.push('--prod');
  }
  
  // Scope (team/org)
  if (vercelConfig.orgId) {
    args.push('--scope', vercelConfig.orgId);
  }
  
  // Debug mode
  if (vercelConfig.debug) {
    args.push('--debug');
  }
  
  // Archive mode for large projects
  if (vercelConfig.archive) {
    args.push('--archive=tgz');
  }
  
  // Prebuilt deployment
  if (vercelConfig.prebuilt) {
    args.push('--prebuilt');
  }
  
  // No-wait for async deployment
  if (vercelConfig.noWait) {
    args.push('--no-wait');
  }
  
  // Force deployment
  if (vercelConfig.force) {
    args.push('--force');
  }
  
  // Regions
  if (vercelConfig.regions && vercelConfig.regions.length > 0) {
    args.push('--regions', vercelConfig.regions.join(','));
  }
  
  // Build environment variables
  if (vercelConfig.buildEnv) {
    for (const [key, value] of Object.entries(vercelConfig.buildEnv)) {
      args.push('--build-env', `${key}=${value}`);
    }
  }
  
  // Runtime environment variables
  if (vercelConfig.runtimeEnv) {
    for (const [key, value] of Object.entries(vercelConfig.runtimeEnv)) {
      args.push('--env', `${key}=${value}`);
    }
  }
  
  // Metadata
  if (vercelConfig.meta) {
    for (const [key, value] of Object.entries(vercelConfig.meta)) {
      args.push('--meta', `${key}=${value}`);
    }
  }
  
  return args.join(' ');
}

/**
 * Deploy to Vercel with sophisticated configuration
 */
export async function deployVercel(
  cwd: string,
  buildDir: string,
  vercelConfig: VercelConfig,
  target: 'preview' | 'production' = 'preview'
): Promise<VercelDeployResult> {
  // Check if CLI is installed
  const installed = await checkCli('vercel');
  if (!installed) {
    return {
      success: false,
      message: `❌ Vercel CLI not installed.\n\nInstall: npm install -g vercel`,
      provider: 'vercel',
    };
  }
  
  // Get token
  const token = getVercelToken(vercelConfig);
  if (!token) {
    return {
      success: false,
      message: `❌ Vercel requires authentication.\n\n` +
        `Setup: /vercel_setup <token>\n\n` +
        `Get token: https://vercel.com/account/tokens`,
      provider: 'vercel',
    };
  }
  
  // Resolve build directory
  let fullBuildPath: string;
  if (buildDir === '.' || buildDir === './') {
    fullBuildPath = cwd;
  } else if (buildDir) {
    fullBuildPath = resolve(join(cwd, buildDir));
  } else {
    // Auto-detect
    const detected = await detectBuildDir(cwd);
    if (!detected) {
      const available = await listDeployableDirs(cwd);
      let msg = `❌ No deployable directory found.\n\n`;
      
      if (available.length > 0) {
        msg += `📁 Available directories:\n`;
        available.forEach(d => msg += `  • ${d}\n`);
        msg += `\nUse: /vercel <directory>`;
      } else {
        msg += `💡 Options:\n`;
        msg += `  • Run your build: npm run build\n`;
        msg += `  • Deploy current dir: /vercel .\n`;
        msg += `  • Specify folder: /vercel dist`;
      }
      
      return {
        success: false,
        message: msg,
        provider: 'vercel',
      };
    }
    fullBuildPath = resolve(join(cwd, detected));
  }
  
  // Check if build directory exists
  try {
    await access(fullBuildPath);
  } catch {
    return {
      success: false,
      message: `❌ Directory not found: ${buildDir || 'auto-detect failed'}\n\n` +
        `💡 Run your build first: npm run build`,
      provider: 'vercel',
    };
  }
  
  // Build command
  const cmd = buildVercelCommand(fullBuildPath, vercelConfig, target);
  console.log(`[Vercel] Deploying with: ${cmd}`);
  
  // Build environment with token
  const deployEnv = { ...process.env, VERCEL_TOKEN: token };
  
  try {
    const timeout = vercelConfig.debug ? 300000 : 180000; // 5 min for debug, 3 min normal
    const { stdout, stderr } = await execAsync(cmd, {
      cwd,
      timeout,
      env: deployEnv,
      maxBuffer: 10 * 1024 * 1024, // 10MB for debug output
    });
    
    const output = stdout + stderr;
    
    // Parse output for URLs and metadata
    const urlMatch = output.match(/https:\/\/[^\s]+\.vercel\.app/);
    const inspectorMatch = output.match(/https:\/\/vercel\.com\/[^\s]+/);
    const deployIdMatch = output.match(/dpl_[a-zA-Z0-9]+/);
    
    const url = urlMatch ? urlMatch[0] : undefined;
    const inspectorUrl = inspectorMatch ? inspectorMatch[0] : undefined;
    const deploymentId = deployIdMatch ? deployIdMatch[0] : undefined;
    
    // Build success message
    let msg = `✅ Deployed to Vercel!\n\n`;
    msg += `🎯 Target: ${target.toUpperCase()}\n`;
    
    if (url) {
      msg += `🔗 URL: ${url}\n`;
    }
    
    if (inspectorUrl) {
      msg += `🔍 Inspector: ${inspectorUrl}\n`;
    }
    
    if (deploymentId) {
      msg += `📋 ID: ${deploymentId}\n`;
    }
    
    // Add debug output if enabled
    if (vercelConfig.debug) {
      msg += `\n📊 Debug Output:\n\`\`\`\n${output.slice(0, 2000)}\n\`\`\``;
    }
    
    return {
      success: true,
      message: msg,
      url,
      inspectorUrl,
      deploymentId,
      target,
      provider: 'vercel',
      debugOutput: vercelConfig.debug ? output : undefined,
    };
  } catch (error) {
    const err = error as Error & { stdout?: string; stderr?: string };
    const output = (err.stdout || '') + (err.stderr || '');
    
    // Parse common errors
    let errorMsg = `❌ Vercel deploy failed\n\n`;
    
    if (output.includes('Invalid token') || output.includes('401')) {
      errorMsg += `🔑 Invalid or expired token.\n\n`;
      errorMsg += `Fix: /vercel_setup <new-token>\n`;
      errorMsg += `Get token: https://vercel.com/account/tokens`;
    } else if (output.includes('rate limit') || output.includes('429')) {
      errorMsg += `⏱️ Rate limited. Wait a few minutes and try again.\n\n`;
      errorMsg += `Free tier: 100 deployments/day`;
    } else if (output.includes('not found') || output.includes('404')) {
      errorMsg += `📁 Project or directory not found.\n\n`;
      errorMsg += `Check: /vercel_status`;
    } else if (output.includes('ETIMEDOUT') || output.includes('ECONNRESET')) {
      errorMsg += `🌐 Network error. Check your connection.\n\n`;
      errorMsg += `Retry: /vercel ${buildDir || ''}`;
    } else {
      errorMsg += `Error: ${err.message}\n\n`;
      if (vercelConfig.debug && output) {
        errorMsg += `📊 Debug:\n\`\`\`\n${output.slice(0, 1500)}\n\`\`\``;
      } else {
        errorMsg += `💡 Enable debug: /vercel_debug on`;
      }
    }
    
    return {
      success: false,
      message: errorMsg,
      provider: 'vercel',
      debugOutput: output,
    };
  }
}

/**
 * Get Vercel configuration status and setup instructions
 */
export function getVercelSetupInfo(vercelConfig?: VercelConfig): string {
  const config = vercelConfig || DEFAULT_VERCEL_CONFIG;
  
  const hasUserToken = !!config.token;
  const hasServerToken = !!process.env.VERCEL_TOKEN;
  const useDefault = config.useDefaultToken !== false;
  
  const isConfigured = hasUserToken || (useDefault && hasServerToken);
  
  let msg = '▲ Vercel Configuration\n\n';
  
  msg += `Status: ${isConfigured ? '✅ Configured' : '❌ Not configured'}\n\n`;
  
  msg += `🔑 Authentication:\n`;
  msg += `  Your Token: ${hasUserToken ? '✅ Set' : '❌ Not set'}\n`;
  msg += `  Server Token: ${hasServerToken ? '✅ Available' : '❌ Not available'}\n`;
  msg += `  Use Server: ${useDefault ? '✅ Yes' : '❌ No'}\n\n`;
  
  if (config.projectName || config.projectId) {
    msg += `📦 Project:\n`;
    if (config.projectName) msg += `  Name: ${config.projectName}\n`;
    if (config.projectId) msg += `  ID: ${config.projectId}\n`;
    if (config.orgId) msg += `  Team: ${config.orgId}\n`;
    msg += '\n';
  }
  
  msg += `⚙️ Settings:\n`;
  msg += `  Default Target: ${config.defaultTarget}\n`;
  msg += `  Debug Mode: ${config.debug ? '✅ ON' : '❌ OFF'}\n`;
  msg += `  Archive Mode: ${config.archive ? '✅ ON' : '❌ OFF'}\n`;
  msg += `  Prebuilt: ${config.prebuilt ? '✅ ON' : '❌ OFF'}\n`;
  
  if (config.regions && config.regions.length > 0) {
    msg += `  Regions: ${config.regions.join(', ')}\n`;
  }
  
  const buildEnvCount = Object.keys(config.buildEnv || {}).length;
  const runtimeEnvCount = Object.keys(config.runtimeEnv || {}).length;
  if (buildEnvCount > 0 || runtimeEnvCount > 0) {
    msg += `\n🔐 Environment Variables:\n`;
    msg += `  Build: ${buildEnvCount} vars\n`;
    msg += `  Runtime: ${runtimeEnvCount} vars\n`;
  }
  
  msg += '\n';
  
  if (!isConfigured) {
    msg += '📋 Setup:\n\n';
    msg += '/vercel_setup <token>\n\n';
    msg += 'Get token: https://vercel.com/account/tokens\n\n';
    msg += '📋 Commands:\n';
    msg += '/vercel [dir] - Deploy to preview\n';
    msg += '/vercel_prod [dir] - Deploy to production\n';
    msg += '/vercel_debug on|off - Toggle debug\n';
    msg += '/vercel_env add KEY=value - Add env var';
  } else {
    msg += '✅ Ready to deploy!\n\n';
    msg += '/vercel [dir] - Preview deployment\n';
    msg += '/vercel_prod [dir] - Production deployment';
  }
  
  return msg;
}

/**
 * Format environment variables for display
 */
export function formatVercelEnvVars(vercelConfig: VercelConfig): string {
  const buildEnv = vercelConfig.buildEnv || {};
  const runtimeEnv = vercelConfig.runtimeEnv || {};
  
  const buildKeys = Object.keys(buildEnv);
  const runtimeKeys = Object.keys(runtimeEnv);
  
  if (buildKeys.length === 0 && runtimeKeys.length === 0) {
    return '🔐 No environment variables configured.\n\n' +
      'Add: /vercel_env add KEY=value [build|runtime]\n' +
      'Example: /vercel_env add API_URL=https://api.example.com';
  }
  
  let msg = '🔐 Vercel Environment Variables\n\n';
  
  if (buildKeys.length > 0) {
    msg += '🔨 Build-time (--build-env):\n';
    for (const key of buildKeys) {
      const value = buildEnv[key];
      const masked = value.length > 8 ? value.slice(0, 4) + '****' : '****';
      msg += `  ${key}=${masked}\n`;
    }
    msg += '\n';
  }
  
  if (runtimeKeys.length > 0) {
    msg += '🚀 Runtime (--env):\n';
    for (const key of runtimeKeys) {
      const value = runtimeEnv[key];
      const masked = value.length > 8 ? value.slice(0, 4) + '****' : '****';
      msg += `  ${key}=${masked}\n`;
    }
    msg += '\n';
  }
  
  msg += '📋 Commands:\n';
  msg += '/vercel_env add KEY=value [build|runtime]\n';
  msg += '/vercel_env remove KEY [build|runtime]\n';
  msg += '/vercel_env clear - Remove all';
  
  return msg;
}
