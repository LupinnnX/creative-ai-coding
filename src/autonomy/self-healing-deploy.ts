/**
 * Self-Healing Deployment System
 * NOVA Framework v6.0 - ARCTURUS Guardian Implementation
 * 
 * Automatically diagnoses and fixes deployment errors without user intervention.
 * 
 * Workflow:
 * 1. User runs /preview
 * 2. Deployment fails with error
 * 3. ARCTURUS analyzes error logs
 * 4. Applies automatic fix
 * 5. Retries deployment
 * 6. Reports success or escalates to user
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { access, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { VercelConfig } from './config';
import { deployVercel, scanForDeployableContent } from './preview-deploy';

const execAsync = promisify(exec);

/**
 * Error categories for deployment failures
 */
export type DeployErrorCategory = 
  | 'auth'           // Token/authentication issues
  | 'build'          // Build failures (missing deps, syntax errors)
  | 'config'         // Configuration issues (vercel.json, package.json)
  | 'directory'      // Missing or wrong directory
  | 'network'        // Network/timeout issues
  | 'rate_limit'     // Rate limiting
  | 'framework'      // Framework-specific issues
  | 'dependency'     // Missing dependencies
  | 'unknown';       // Unknown errors

/**
 * Diagnosis result from ARCTURUS analysis
 */
export interface DiagnosisResult {
  category: DeployErrorCategory;
  problem: string;
  solution: string;
  autoFixable: boolean;
  fixAction?: () => Promise<FixResult>;
  confidence: number; // 0-100
}

/**
 * Result of an auto-fix attempt
 */
export interface FixResult {
  success: boolean;
  message: string;
  action: string;
}

/**
 * Self-healing deployment result
 */
export interface SelfHealingResult {
  success: boolean;
  message: string;
  url?: string;
  diagnosis?: DiagnosisResult;
  fixApplied?: FixResult;
  retryCount: number;
  arcturus: {
    activated: boolean;
    analysis: string;
    recommendation: string;
  };
}

/**
 * Error patterns for diagnosis
 */
const ERROR_PATTERNS: Array<{
  pattern: RegExp | string;
  category: DeployErrorCategory;
  problem: string;
  solution: string;
  autoFixable: boolean;
  confidence: number;
}> = [
  // Authentication errors
  {
    pattern: /Invalid token|401|Unauthorized|authentication failed/i,
    category: 'auth',
    problem: 'Invalid or expired Vercel token',
    solution: 'Update your Vercel token with /vercel_setup <new-token>',
    autoFixable: false,
    confidence: 95,
  },
  {
    pattern: /VERCEL_TOKEN.*not set|missing.*token/i,
    category: 'auth',
    problem: 'Vercel token not configured',
    solution: 'Set your token with /vercel_setup <token>',
    autoFixable: false,
    confidence: 95,
  },
  
  // Build errors
  {
    pattern: /npm ERR!|yarn error|pnpm ERR!/i,
    category: 'build',
    problem: 'Package manager error during build',
    solution: 'Run npm install locally first, then retry',
    autoFixable: true,
    confidence: 85,
  },
  {
    pattern: /Cannot find module|Module not found|ENOENT.*node_modules/i,
    category: 'dependency',
    problem: 'Missing dependencies',
    solution: 'Installing dependencies automatically',
    autoFixable: true,
    confidence: 90,
  },
  {
    pattern: /SyntaxError|Unexpected token|Parse error/i,
    category: 'build',
    problem: 'Syntax error in source code',
    solution: 'Fix syntax errors in your code before deploying',
    autoFixable: false,
    confidence: 85,
  },
  {
    pattern: /TypeScript.*error|TS\d{4}:/i,
    category: 'build',
    problem: 'TypeScript compilation error',
    solution: 'Fix TypeScript errors before deploying',
    autoFixable: false,
    confidence: 90,
  },
  {
    pattern: /Build failed|build:.*failed|exit code 1/i,
    category: 'build',
    problem: 'Build process failed',
    solution: 'Check build logs and fix errors',
    autoFixable: false,
    confidence: 70,
  },
  
  // Directory errors
  {
    pattern: /ENOENT|no such file or directory|directory not found/i,
    category: 'directory',
    problem: 'Build directory not found',
    solution: 'Running build command to create output directory',
    autoFixable: true,
    confidence: 85,
  },
  {
    pattern: /No deployable.*found|empty directory/i,
    category: 'directory',
    problem: 'No deployable content found',
    solution: 'Build your project first with npm run build',
    autoFixable: true,
    confidence: 80,
  },
  
  // Configuration errors
  {
    pattern: /vercel\.json.*invalid|configuration.*error/i,
    category: 'config',
    problem: 'Invalid vercel.json configuration',
    solution: 'Fix vercel.json syntax or remove it for auto-detection',
    autoFixable: true,
    confidence: 75,
  },
  {
    pattern: /package\.json.*not found|missing.*package\.json/i,
    category: 'config',
    problem: 'Missing package.json',
    solution: 'Initialize project with npm init or create package.json',
    autoFixable: true,
    confidence: 80,
  },
  {
    pattern: /framework.*not detected|unknown.*framework/i,
    category: 'framework',
    problem: 'Framework not detected by Vercel',
    solution: 'Add framework configuration to vercel.json',
    autoFixable: true,
    confidence: 70,
  },
  
  // Network errors
  {
    pattern: /ETIMEDOUT|ECONNRESET|ECONNREFUSED|network.*error/i,
    category: 'network',
    problem: 'Network connection error',
    solution: 'Retrying deployment with longer timeout',
    autoFixable: true,
    confidence: 80,
  },
  {
    pattern: /timeout|timed out/i,
    category: 'network',
    problem: 'Deployment timed out',
    solution: 'Retrying with extended timeout',
    autoFixable: true,
    confidence: 75,
  },
  
  // Rate limiting
  {
    pattern: /rate limit|429|too many requests/i,
    category: 'rate_limit',
    problem: 'Rate limited by Vercel',
    solution: 'Wait a few minutes before retrying',
    autoFixable: true,
    confidence: 95,
  },
  
  // Framework-specific
  {
    pattern: /next.*export|getServerSideProps.*static/i,
    category: 'framework',
    problem: 'Next.js static export incompatibility',
    solution: 'Remove getServerSideProps or use SSR deployment',
    autoFixable: false,
    confidence: 85,
  },
];

/**
 * ARCTURUS: Analyze deployment error and diagnose the problem
 */
export function diagnoseError(errorOutput: string, errorMessage: string): DiagnosisResult {
  const fullError = `${errorMessage}\n${errorOutput}`.toLowerCase();
  
  // Find matching error pattern
  for (const pattern of ERROR_PATTERNS) {
    const regex = typeof pattern.pattern === 'string' 
      ? new RegExp(pattern.pattern, 'i')
      : pattern.pattern;
    
    if (regex.test(fullError)) {
      return {
        category: pattern.category,
        problem: pattern.problem,
        solution: pattern.solution,
        autoFixable: pattern.autoFixable,
        confidence: pattern.confidence,
      };
    }
  }
  
  // Unknown error
  return {
    category: 'unknown',
    problem: 'Unknown deployment error',
    solution: 'Enable debug mode with /vercel_debug on and check logs',
    autoFixable: false,
    confidence: 30,
  };
}

/**
 * ARCTURUS: Attempt to auto-fix the diagnosed problem
 */
export async function attemptAutoFix(
  cwd: string,
  diagnosis: DiagnosisResult,
  buildDir: string
): Promise<FixResult> {
  console.log(`[ARCTURUS] Attempting auto-fix for: ${diagnosis.category}`);
  
  switch (diagnosis.category) {
    case 'dependency':
      return await fixMissingDependencies(cwd);
    
    case 'directory':
      return await fixMissingBuildDir(cwd, buildDir);
    
    case 'config':
      return await fixConfiguration(cwd);
    
    case 'network':
      // Network issues just need a retry with longer timeout
      return {
        success: true,
        message: 'Will retry with extended timeout',
        action: 'extend_timeout',
      };
    
    case 'rate_limit':
      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second wait
      return {
        success: true,
        message: 'Waited 30 seconds for rate limit reset',
        action: 'wait_retry',
      };
    
    case 'framework':
      return await fixFrameworkConfig(cwd);
    
    default:
      return {
        success: false,
        message: 'Cannot auto-fix this error type',
        action: 'none',
      };
  }
}

/**
 * Fix missing dependencies by running npm install
 */
async function fixMissingDependencies(cwd: string): Promise<FixResult> {
  try {
    console.log('[ARCTURUS] Installing dependencies...');
    
    // Detect package manager
    let installCmd = 'npm install';
    try {
      await access(join(cwd, 'yarn.lock'));
      installCmd = 'yarn install';
    } catch {
      try {
        await access(join(cwd, 'pnpm-lock.yaml'));
        installCmd = 'pnpm install';
      } catch {
        // Default to npm
      }
    }
    
    await execAsync(installCmd, { cwd, timeout: 120000 });
    
    return {
      success: true,
      message: `Dependencies installed with: ${installCmd}`,
      action: 'install_deps',
    };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      message: `Failed to install dependencies: ${err.message}`,
      action: 'install_deps',
    };
  }
}

/**
 * Fix missing build directory by running build command
 */
async function fixMissingBuildDir(cwd: string, buildDir: string): Promise<FixResult> {
  try {
    console.log('[ARCTURUS] Running build command...');
    
    // Read package.json to find build script
    const pkgPath = join(cwd, 'package.json');
    let buildCmd = 'npm run build';
    
    try {
      const pkgContent = await readFile(pkgPath, 'utf-8');
      const pkg = JSON.parse(pkgContent);
      
      if (pkg.scripts?.build) {
        buildCmd = 'npm run build';
      } else if (pkg.scripts?.['build:prod']) {
        buildCmd = 'npm run build:prod';
      } else if (pkg.scripts?.generate) {
        buildCmd = 'npm run generate';
      } else {
        return {
          success: false,
          message: 'No build script found in package.json',
          action: 'build',
        };
      }
    } catch {
      return {
        success: false,
        message: 'No package.json found',
        action: 'build',
      };
    }
    
    // Run build
    await execAsync(buildCmd, { cwd, timeout: 300000 }); // 5 min timeout
    
    // Verify build directory exists
    const targetDir = buildDir || 'dist';
    try {
      await access(join(cwd, targetDir));
      return {
        success: true,
        message: `Build completed: ${buildCmd}`,
        action: 'build',
      };
    } catch {
      // Try common alternatives
      for (const alt of ['build', 'out', 'public', '.next']) {
        try {
          await access(join(cwd, alt));
          return {
            success: true,
            message: `Build completed, output in: ${alt}`,
            action: 'build',
          };
        } catch { /* continue */ }
      }
      
      return {
        success: false,
        message: 'Build completed but output directory not found',
        action: 'build',
      };
    }
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      message: `Build failed: ${err.message}`,
      action: 'build',
    };
  }
}

/**
 * Fix configuration issues
 */
async function fixConfiguration(cwd: string): Promise<FixResult> {
  try {
    const vercelJsonPath = join(cwd, 'vercel.json');
    
    // Check if vercel.json exists and is valid
    try {
      const content = await readFile(vercelJsonPath, 'utf-8');
      JSON.parse(content); // Validate JSON
      return {
        success: false,
        message: 'vercel.json is valid, issue may be elsewhere',
        action: 'config',
      };
    } catch {
      // Invalid or missing vercel.json - create a basic one
      const scan = await scanForDeployableContent(cwd);
      
      const config: Record<string, unknown> = {
        version: 2,
      };
      
      // Add framework hint if detected
      if (scan.detectedFramework) {
        const frameworkMap: Record<string, string> = {
          'Next.js': 'nextjs',
          'Nuxt': 'nuxtjs',
          'Vite': 'vite',
          'Create React App': 'create-react-app',
          'Gatsby': 'gatsby',
          'Astro': 'astro',
          'SvelteKit': 'sveltekit',
          'Vue': 'vue',
        };
        
        const framework = frameworkMap[scan.detectedFramework];
        if (framework) {
          config.framework = framework;
        }
      }
      
      // Add output directory if detected
      if (scan.recommended && scan.recommended !== '.') {
        config.outputDirectory = scan.recommended;
      }
      
      await writeFile(vercelJsonPath, JSON.stringify(config, null, 2));
      
      return {
        success: true,
        message: `Created vercel.json with detected settings`,
        action: 'config',
      };
    }
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      message: `Failed to fix configuration: ${err.message}`,
      action: 'config',
    };
  }
}

/**
 * Fix framework-specific configuration
 */
async function fixFrameworkConfig(cwd: string): Promise<FixResult> {
  try {
    const scan = await scanForDeployableContent(cwd);
    
    if (!scan.detectedFramework) {
      return {
        success: false,
        message: 'Could not detect framework',
        action: 'framework',
      };
    }
    
    // Create or update vercel.json with framework settings
    const vercelJsonPath = join(cwd, 'vercel.json');
    let config: Record<string, unknown> = { version: 2 };
    
    try {
      const existing = await readFile(vercelJsonPath, 'utf-8');
      config = JSON.parse(existing);
    } catch { /* use default */ }
    
    const frameworkMap: Record<string, string> = {
      'Next.js': 'nextjs',
      'Nuxt': 'nuxtjs',
      'Vite': 'vite',
      'Create React App': 'create-react-app',
      'Gatsby': 'gatsby',
      'Astro': 'astro',
      'SvelteKit': 'sveltekit',
      'Vue': 'vue',
      'Angular': 'angular',
      'Solid': 'solidstart',
    };
    
    const framework = frameworkMap[scan.detectedFramework];
    if (framework) {
      config.framework = framework;
      await writeFile(vercelJsonPath, JSON.stringify(config, null, 2));
      
      return {
        success: true,
        message: `Added framework: ${framework} to vercel.json`,
        action: 'framework',
      };
    }
    
    return {
      success: false,
      message: `Unknown framework: ${scan.detectedFramework}`,
      action: 'framework',
    };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      message: `Failed to fix framework config: ${err.message}`,
      action: 'framework',
    };
  }
}

/**
 * Format ARCTURUS analysis for display
 */
export function formatArcturusAnalysis(
  diagnosis: DiagnosisResult,
  fixResult?: FixResult
): string {
  let msg = `\n🛡️ ARCTURUS Ξ124897 ACTIVATED\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
  
  msg += `📊 Error Analysis:\n`;
  msg += `  Category: ${diagnosis.category.toUpperCase()}\n`;
  msg += `  Problem: ${diagnosis.problem}\n`;
  msg += `  Confidence: ${diagnosis.confidence}%\n\n`;
  
  if (diagnosis.autoFixable) {
    msg += `🔧 Auto-Fix: AVAILABLE\n`;
    msg += `  Solution: ${diagnosis.solution}\n\n`;
    
    if (fixResult) {
      if (fixResult.success) {
        msg += `✅ Fix Applied: ${fixResult.message}\n`;
        msg += `  Action: ${fixResult.action}\n\n`;
      } else {
        msg += `❌ Fix Failed: ${fixResult.message}\n\n`;
      }
    }
  } else {
    msg += `⚠️ Manual Fix Required:\n`;
    msg += `  ${diagnosis.solution}\n\n`;
  }
  
  return msg;
}

/**
 * Self-healing deployment with automatic error recovery
 * 
 * @param cwd Working directory
 * @param buildDir Build directory to deploy
 * @param vercelConfig Vercel configuration
 * @param target Deployment target (preview/production)
 * @param maxRetries Maximum retry attempts (default: 2)
 */
export async function selfHealingDeploy(
  cwd: string,
  buildDir: string,
  vercelConfig: VercelConfig,
  target: 'preview' | 'production' = 'preview',
  maxRetries: number = 2
): Promise<SelfHealingResult> {
  let retryCount = 0;
  let lastDiagnosis: DiagnosisResult | undefined;
  let lastFix: FixResult | undefined;
  
  // Enable debug mode for better error analysis
  const configWithDebug = { ...vercelConfig, debug: true };
  
  while (retryCount <= maxRetries) {
    console.log(`[SelfHealing] Attempt ${retryCount + 1}/${maxRetries + 1}`);
    
    // Attempt deployment
    const result = await deployVercel(cwd, buildDir, configWithDebug, target);
    
    if (result.success) {
      // Success!
      let message = result.message;
      
      if (retryCount > 0 && lastDiagnosis && lastFix) {
        message = `✅ Deployment succeeded after auto-fix!\n\n`;
        message += formatArcturusAnalysis(lastDiagnosis, lastFix);
        message += `\n${result.message}`;
      }
      
      return {
        success: true,
        message,
        url: result.url,
        diagnosis: lastDiagnosis,
        fixApplied: lastFix,
        retryCount,
        arcturus: {
          activated: retryCount > 0,
          analysis: lastDiagnosis ? `${lastDiagnosis.category}: ${lastDiagnosis.problem}` : '',
          recommendation: lastDiagnosis?.solution || '',
        },
      };
    }
    
    // Deployment failed - analyze error
    const errorOutput = result.debugOutput || '';
    const diagnosis = diagnoseError(errorOutput, result.message);
    lastDiagnosis = diagnosis;
    
    console.log(`[ARCTURUS] Diagnosed: ${diagnosis.category} (${diagnosis.confidence}% confidence)`);
    
    // Check if we can auto-fix
    if (!diagnosis.autoFixable || retryCount >= maxRetries) {
      // Cannot auto-fix or max retries reached
      let message = result.message;
      message += formatArcturusAnalysis(diagnosis, lastFix);
      
      if (retryCount >= maxRetries) {
        message += `\n⚠️ Max retries (${maxRetries}) reached. Manual intervention required.`;
      }
      
      return {
        success: false,
        message,
        diagnosis,
        fixApplied: lastFix,
        retryCount,
        arcturus: {
          activated: true,
          analysis: `${diagnosis.category}: ${diagnosis.problem}`,
          recommendation: diagnosis.solution,
        },
      };
    }
    
    // Attempt auto-fix
    console.log(`[ARCTURUS] Attempting auto-fix: ${diagnosis.solution}`);
    const fixResult = await attemptAutoFix(cwd, diagnosis, buildDir);
    lastFix = fixResult;
    
    if (!fixResult.success) {
      // Fix failed
      let message = result.message;
      message += formatArcturusAnalysis(diagnosis, fixResult);
      
      return {
        success: false,
        message,
        diagnosis,
        fixApplied: fixResult,
        retryCount,
        arcturus: {
          activated: true,
          analysis: `${diagnosis.category}: ${diagnosis.problem}`,
          recommendation: diagnosis.solution,
        },
      };
    }
    
    // Fix applied, retry deployment
    retryCount++;
    console.log(`[ARCTURUS] Fix applied, retrying deployment...`);
  }
  
  // Should not reach here, but just in case
  return {
    success: false,
    message: '❌ Deployment failed after all retry attempts',
    diagnosis: lastDiagnosis,
    fixApplied: lastFix,
    retryCount,
    arcturus: {
      activated: true,
      analysis: lastDiagnosis ? `${lastDiagnosis.category}: ${lastDiagnosis.problem}` : 'Unknown error',
      recommendation: lastDiagnosis?.solution || 'Check logs manually',
    },
  };
}
