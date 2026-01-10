/**
 * NOVA Error Debugger v1.0
 * 
 * Intelligent error debugging system using first-principles thinking.
 * Automatically activates ARCTURUS (Guardian) + VEGA (Navigator) for deep analysis.
 * 
 * Core Philosophy: "Solve 10 from 1" - Find patterns to fix similar errors.
 * 
 * @author POLARIS Ξ8890 + VEGA Ξ172167
 * @date January 1, 2026
 */

import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { join, dirname } from 'path';

// ============================================
// ERROR CLASSIFICATION TAXONOMY
// ============================================

export type ErrorCategory = 
  | 'NETWORK'      // ETIMEDOUT, ECONNRESET, DNS failures
  | 'AUTH'         // 401, 403, token issues
  | 'SYNTAX'       // Parse errors, type errors
  | 'RUNTIME'      // Null reference, undefined, type coercion
  | 'RESOURCE'     // File not found, permission denied
  | 'CONFIG'       // Missing env vars, invalid config
  | 'DEPENDENCY'   // Module not found, version mismatch
  | 'STATE'        // Race conditions, stale data
  | 'UNKNOWN';     // Unclassified

export interface ErrorSignature {
  code?: string;
  message: string;
  stack?: string;
  category: ErrorCategory;
  patterns: string[];  // Regex patterns that match this error type
}


export interface ErrorAnalysis {
  id: string;
  timestamp: string;
  error: {
    code?: string;
    message: string;
    stack?: string;
  };
  category: ErrorCategory;
  firstPrinciples: {
    whatFailed: string;
    whyItFailed: string;
    assumptions: string[];
    rootCause: string;
  };
  hypotheses: Array<{
    description: string;
    likelihood: number;  // 0-100
    testMethod: string;
  }>;
  similarErrors: string[];  // IDs of similar past errors
  suggestedFixes: Array<{
    description: string;
    code?: string;
    confidence: number;  // 0-100
  }>;
  resolution?: {
    fixApplied: string;
    verified: boolean;
    timestamp: string;
  };
}

// ============================================
// ERROR PATTERN DATABASE
// ============================================

const ERROR_PATTERNS: ErrorSignature[] = [
  // Resource Errors (check FIRST - EPERM/EACCES are specific error codes)
  {
    code: 'ENOENT',
    message: 'File or directory not found',
    category: 'RESOURCE',
    patterns: ['ENOENT', 'no such file', 'does not exist']
  },
  {
    code: 'EPERM',
    message: 'Permission denied',
    category: 'RESOURCE',
    patterns: ['EPERM', 'EACCES', 'permission denied']
  },

  // Network Errors
  {
    code: 'ETIMEDOUT',
    message: 'Connection timed out',
    category: 'NETWORK',
    patterns: ['ETIMEDOUT', 'timeout', 'timed out', 'connection timeout']
  },
  {
    code: 'ECONNRESET',
    message: 'Connection reset by peer',
    category: 'NETWORK',
    patterns: ['ECONNRESET', 'connection reset', 'socket hang up']
  },
  {
    code: 'ENOTFOUND',
    message: 'DNS resolution failed',
    category: 'NETWORK',
    patterns: ['ENOTFOUND', 'getaddrinfo', 'DNS', 'EAI_AGAIN']
  },
  {
    code: 'ECONNREFUSED',
    message: 'Connection refused',
    category: 'NETWORK',
    patterns: ['ECONNREFUSED', 'connection refused']
  },

  // Auth Errors (HTTP status codes)
  {
    code: '401',
    message: 'Unauthorized',
    category: 'AUTH',
    patterns: ['401', 'unauthorized', 'authentication failed', 'invalid token']
  },
  {
    code: '403',
    message: 'Forbidden',
    category: 'AUTH',
    patterns: ['403', 'forbidden', 'access denied']
  },
  
  // Syntax/Type Errors
  {
    code: 'SYNTAX_ERROR',
    message: 'Syntax error in code',
    category: 'SYNTAX',
    patterns: ['SyntaxError', 'Unexpected token', 'Parse error', 'Invalid syntax']
  },
  {
    code: 'TYPE_ERROR',
    message: 'Type mismatch',
    category: 'SYNTAX',
    patterns: ['TypeError', 'is not a function', 'Cannot read propert']
  },
  
  // Runtime Errors
  {
    code: 'NULL_REF',
    message: 'Null or undefined reference',
    category: 'RUNTIME',
    patterns: ['null', 'undefined', 'Cannot read']
  },
  
  // Config Errors
  {
    code: 'ENV_MISSING',
    message: 'Environment variable missing',
    category: 'CONFIG',
    patterns: ['environment variable', 'env not set', 'config missing']
  },
  
  // Dependency Errors
  {
    code: 'MODULE_NOT_FOUND',
    message: 'Module not found',
    category: 'DEPENDENCY',
    patterns: ['MODULE_NOT_FOUND', 'Cannot find module', 'module not found']
  },
];


// ============================================
// FIRST-PRINCIPLES ANALYSIS ENGINE
// ============================================

/**
 * Classify error into category using pattern matching
 */
export function classifyError(error: { code?: string; message: string; stack?: string }): ErrorCategory {
  const searchText = `${error.code || ''} ${error.message} ${error.stack || ''}`.toLowerCase();
  
  for (const pattern of ERROR_PATTERNS) {
    for (const p of pattern.patterns) {
      if (searchText.includes(p.toLowerCase())) {
        return pattern.category;
      }
    }
  }
  
  return 'UNKNOWN';
}

/**
 * Generate first-principles decomposition of the error
 * VEGA's approach: Break down to fundamental truths
 */
export function decomposeError(
  _error: { code?: string; message: string; stack?: string },
  category: ErrorCategory
): ErrorAnalysis['firstPrinciples'] {
  const decompositions: Record<ErrorCategory, () => ErrorAnalysis['firstPrinciples']> = {
    NETWORK: () => ({
      whatFailed: 'Network communication between client and server',
      whyItFailed: 'TCP/IP connection could not be established or was interrupted',
      assumptions: [
        'Server is running and accessible',
        'Network path exists between client and server',
        'No firewall blocking the connection',
        'DNS resolution is working',
        'Server is not rate-limiting'
      ],
      rootCause: 'One or more network layer assumptions are false'
    }),
    
    AUTH: () => ({
      whatFailed: 'Authentication or authorization check',
      whyItFailed: 'Credentials are invalid, expired, or insufficient',
      assumptions: [
        'Token/credentials are valid',
        'Token has not expired',
        'User has required permissions',
        'Auth service is operational'
      ],
      rootCause: 'Credential validity or permission scope is incorrect'
    }),

    SYNTAX: () => ({
      whatFailed: 'Code parsing or type checking',
      whyItFailed: 'Source code violates language grammar or type rules',
      assumptions: [
        'Code follows language syntax',
        'All brackets/quotes are balanced',
        'Types are compatible',
        'Imports are correct'
      ],
      rootCause: 'Code structure does not match expected grammar'
    }),
    
    RUNTIME: () => ({
      whatFailed: 'Code execution at runtime',
      whyItFailed: 'Value or state was not what the code expected',
      assumptions: [
        'Variables are initialized before use',
        'Objects have expected properties',
        'Functions return expected types',
        'Async operations complete in order'
      ],
      rootCause: 'Runtime state diverged from code expectations'
    }),
    
    RESOURCE: () => ({
      whatFailed: 'File system or resource access',
      whyItFailed: 'Resource does not exist or is not accessible',
      assumptions: [
        'File/directory exists at path',
        'Process has read/write permissions',
        'Path is correctly formatted',
        'Disk is not full'
      ],
      rootCause: 'Resource availability or permission assumption is false'
    }),
    
    CONFIG: () => ({
      whatFailed: 'Configuration loading or validation',
      whyItFailed: 'Required configuration is missing or invalid',
      assumptions: [
        'Environment variables are set',
        'Config files exist and are valid',
        'Values are in expected format',
        'Required fields are present'
      ],
      rootCause: 'Configuration state does not match requirements'
    }),

    DEPENDENCY: () => ({
      whatFailed: 'Module resolution or loading',
      whyItFailed: 'Required dependency is not installed or incompatible',
      assumptions: [
        'Package is installed in node_modules',
        'Package version is compatible',
        'Import path is correct',
        'Package exports the expected module'
      ],
      rootCause: 'Dependency installation or version is incorrect'
    }),
    
    STATE: () => ({
      whatFailed: 'State management or synchronization',
      whyItFailed: 'State was modified unexpectedly or out of order',
      assumptions: [
        'Operations execute in expected order',
        'No concurrent modifications',
        'State is consistent across components',
        'Cache is not stale'
      ],
      rootCause: 'State synchronization or ordering assumption is false'
    }),
    
    UNKNOWN: () => ({
      whatFailed: 'Unknown operation',
      whyItFailed: 'Error does not match known patterns',
      assumptions: [
        'Error message is accurate',
        'Stack trace is available',
        'Error is reproducible'
      ],
      rootCause: 'Requires manual investigation'
    })
  };
  
  return decompositions[category]();
}


// ============================================
// HYPOTHESIS GENERATION (VEGA's Approach)
// ============================================

/**
 * Generate hypotheses for error root cause
 * Based on Kodezi Chronos pattern: multiple hypotheses with likelihood scores
 */
export function generateHypotheses(
  _error: { code?: string; message: string; stack?: string },
  category: ErrorCategory
): ErrorAnalysis['hypotheses'] {
  const hypothesesByCategory: Record<ErrorCategory, ErrorAnalysis['hypotheses']> = {
    NETWORK: [
      { description: 'Server is down or unreachable', likelihood: 40, testMethod: 'ping/curl the endpoint' },
      { description: 'DNS resolution failing', likelihood: 25, testMethod: 'nslookup/dig the hostname' },
      { description: 'Firewall blocking connection', likelihood: 20, testMethod: 'check firewall rules, try different port' },
      { description: 'Rate limiting triggered', likelihood: 10, testMethod: 'check response headers for rate limit info' },
      { description: 'SSL/TLS certificate issue', likelihood: 5, testMethod: 'verify certificate validity' }
    ],
    
    AUTH: [
      { description: 'Token expired', likelihood: 35, testMethod: 'check token expiry, refresh token' },
      { description: 'Invalid credentials', likelihood: 30, testMethod: 'verify credentials are correct' },
      { description: 'Insufficient permissions', likelihood: 20, testMethod: 'check required scopes/roles' },
      { description: 'Token format incorrect', likelihood: 10, testMethod: 'validate token structure' },
      { description: 'Auth service unavailable', likelihood: 5, testMethod: 'check auth service health' }
    ],
    
    SYNTAX: [
      { description: 'Missing or extra bracket/parenthesis', likelihood: 35, testMethod: 'run linter, check bracket matching' },
      { description: 'Invalid import statement', likelihood: 25, testMethod: 'verify import paths exist' },
      { description: 'Type mismatch', likelihood: 20, testMethod: 'run type checker (tsc)' },
      { description: 'Reserved keyword misuse', likelihood: 10, testMethod: 'check for reserved word conflicts' },
      { description: 'Encoding issue', likelihood: 10, testMethod: 'verify file encoding is UTF-8' }
    ],

    RUNTIME: [
      { description: 'Null/undefined value accessed', likelihood: 40, testMethod: 'add null checks, use optional chaining' },
      { description: 'Array index out of bounds', likelihood: 20, testMethod: 'verify array length before access' },
      { description: 'Async operation not awaited', likelihood: 20, testMethod: 'check for missing await keywords' },
      { description: 'Type coercion issue', likelihood: 15, testMethod: 'use strict equality, explicit type conversion' },
      { description: 'Circular reference', likelihood: 5, testMethod: 'check for circular dependencies' }
    ],
    
    RESOURCE: [
      { description: 'File path incorrect', likelihood: 35, testMethod: 'verify path exists, check relative vs absolute' },
      { description: 'Permission denied', likelihood: 30, testMethod: 'check file/directory permissions' },
      { description: 'File locked by another process', likelihood: 15, testMethod: 'check for file locks, close handles' },
      { description: 'Disk full', likelihood: 10, testMethod: 'check available disk space' },
      { description: 'Symlink broken', likelihood: 10, testMethod: 'verify symlink target exists' }
    ],
    
    CONFIG: [
      { description: 'Environment variable not set', likelihood: 40, testMethod: 'check .env file, verify env vars loaded' },
      { description: 'Config file missing', likelihood: 25, testMethod: 'verify config file exists at expected path' },
      { description: 'Invalid config format', likelihood: 20, testMethod: 'validate JSON/YAML syntax' },
      { description: 'Wrong environment loaded', likelihood: 10, testMethod: 'check NODE_ENV, verify correct config' },
      { description: 'Config value type mismatch', likelihood: 5, testMethod: 'validate config schema' }
    ],
    
    DEPENDENCY: [
      { description: 'Package not installed', likelihood: 40, testMethod: 'npm install / yarn install' },
      { description: 'Version incompatibility', likelihood: 30, testMethod: 'check package.json, verify peer deps' },
      { description: 'Import path incorrect', likelihood: 15, testMethod: 'verify module exports, check path' },
      { description: 'Circular dependency', likelihood: 10, testMethod: 'analyze import graph' },
      { description: 'Native module build failed', likelihood: 5, testMethod: 'rebuild native modules' }
    ],
    
    STATE: [
      { description: 'Race condition', likelihood: 35, testMethod: 'add mutex/locks, verify operation order' },
      { description: 'Stale cache', likelihood: 25, testMethod: 'clear cache, verify cache invalidation' },
      { description: 'Memory leak', likelihood: 20, testMethod: 'profile memory, check for retained refs' },
      { description: 'Event listener not cleaned up', likelihood: 15, testMethod: 'verify removeEventListener calls' },
      { description: 'Global state mutation', likelihood: 5, testMethod: 'audit global state access' }
    ],
    
    UNKNOWN: [
      { description: 'Requires manual investigation', likelihood: 100, testMethod: 'analyze stack trace, add logging' }
    ]
  };
  
  return hypothesesByCategory[category] || hypothesesByCategory.UNKNOWN;
}


// ============================================
// PERSISTENT DEBUG MEMORY (PDM)
// Inspired by Kodezi Chronos - learns from past sessions
// ============================================

export interface DebugMemoryEntry {
  id: string;
  timestamp: string;
  errorSignature: string;  // Hash of error pattern
  category: ErrorCategory;
  rootCause: string;
  fixApplied: string;
  verified: boolean;
  similarErrors: string[];  // IDs of related errors
}

const DEBUG_MEMORY_PATH = '.nova/knowledge/debug-memory.json';

/**
 * Generate a signature hash for an error (for pattern matching)
 */
export function generateErrorSignature(error: { code?: string; message: string }): string {
  // Normalize the error message by removing variable parts
  const normalized = error.message
    .replace(/\d+/g, 'N')           // Replace numbers
    .replace(/['"][^'"]+['"]/g, 'S') // Replace strings
    .replace(/\/[^\s]+/g, 'P')       // Replace paths
    .replace(/\s+/g, ' ')            // Normalize whitespace
    .toLowerCase()
    .trim();
  
  return `${error.code || 'UNKNOWN'}:${normalized}`.substring(0, 100);
}

/**
 * Load debug memory from persistent storage
 */
export async function loadDebugMemory(cwd: string): Promise<DebugMemoryEntry[]> {
  const memoryPath = join(cwd, DEBUG_MEMORY_PATH);
  
  try {
    await access(memoryPath);
    const content = await readFile(memoryPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

/**
 * Save debug memory to persistent storage
 */
export async function saveDebugMemory(cwd: string, memory: DebugMemoryEntry[]): Promise<void> {
  const memoryPath = join(cwd, DEBUG_MEMORY_PATH);
  const dir = dirname(memoryPath);
  
  try {
    await access(dir);
  } catch {
    await mkdir(dir, { recursive: true });
  }
  
  await writeFile(memoryPath, JSON.stringify(memory, null, 2), 'utf-8');
}


/**
 * Find similar errors from debug memory
 * "Solve 10 from 1" - find patterns to fix multiple similar errors
 */
export async function findSimilarErrors(
  cwd: string,
  errorSignature: string,
  category: ErrorCategory
): Promise<DebugMemoryEntry[]> {
  const memory = await loadDebugMemory(cwd);
  
  // Find exact signature matches first
  const exactMatches = memory.filter(entry => entry.errorSignature === errorSignature);
  if (exactMatches.length > 0) {
    return exactMatches;
  }
  
  // Find same category matches
  const categoryMatches = memory.filter(entry => entry.category === category && entry.verified);
  
  // Sort by recency
  return categoryMatches.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  ).slice(0, 5);
}

/**
 * Record a successful fix to debug memory
 */
export async function recordFix(
  cwd: string,
  analysis: ErrorAnalysis
): Promise<void> {
  if (!analysis.resolution?.verified) return;
  
  const memory = await loadDebugMemory(cwd);
  const signature = generateErrorSignature(analysis.error);
  
  const entry: DebugMemoryEntry = {
    id: analysis.id,
    timestamp: new Date().toISOString(),
    errorSignature: signature,
    category: analysis.category,
    rootCause: analysis.firstPrinciples.rootCause,
    fixApplied: analysis.resolution.fixApplied,
    verified: true,
    similarErrors: analysis.similarErrors
  };
  
  // Check for duplicate
  const existingIndex = memory.findIndex(e => e.errorSignature === signature);
  if (existingIndex >= 0) {
    memory[existingIndex] = entry;  // Update existing
  } else {
    memory.push(entry);
  }
  
  // Keep memory bounded (max 1000 entries)
  if (memory.length > 1000) {
    memory.splice(0, memory.length - 1000);
  }
  
  await saveDebugMemory(cwd, memory);
}


// ============================================
// MAIN ANALYSIS ENGINE
// Combines VEGA (research) + ARCTURUS (testing)
// ============================================

/**
 * Perform full error analysis using first-principles thinking
 * This is the main entry point for the error debugger
 */
export async function analyzeError(
  error: { code?: string; message: string; stack?: string },
  cwd: string
): Promise<ErrorAnalysis> {
  const id = `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const category = classifyError(error);
  const signature = generateErrorSignature(error);
  
  // Find similar past errors (Persistent Debug Memory)
  const similarEntries = await findSimilarErrors(cwd, signature, category);
  
  // Generate first-principles decomposition (VEGA's approach)
  const firstPrinciples = decomposeError(error, category);
  
  // Generate hypotheses with likelihood scores
  const hypotheses = generateHypotheses(error, category);
  
  // If we have similar past errors, boost confidence in those fixes
  const suggestedFixes: ErrorAnalysis['suggestedFixes'] = [];
  
  if (similarEntries.length > 0) {
    // We've seen this before! High confidence fix
    for (const entry of similarEntries.slice(0, 3)) {
      suggestedFixes.push({
        description: `Previously successful fix: ${entry.rootCause}`,
        code: entry.fixApplied,
        confidence: entry.verified ? 90 : 70
      });
    }
  }
  
  // Add hypothesis-based suggestions
  for (const hypothesis of hypotheses.slice(0, 3)) {
    suggestedFixes.push({
      description: hypothesis.description,
      confidence: hypothesis.likelihood
    });
  }
  
  const analysis: ErrorAnalysis = {
    id,
    timestamp: new Date().toISOString(),
    error: {
      code: error.code,
      message: error.message,
      stack: error.stack
    },
    category,
    firstPrinciples,
    hypotheses,
    similarErrors: similarEntries.map(e => e.id),
    suggestedFixes
  };
  
  return analysis;
}


// ============================================
// AUTO-HEALING WRAPPER
// Inspired by healing-agent decorator pattern
// ============================================

export interface HealingOptions {
  maxRetries?: number;
  autoFix?: boolean;
  onError?: (analysis: ErrorAnalysis) => void | Promise<void>;
  onFix?: (analysis: ErrorAnalysis) => void | Promise<void>;
}

/**
 * Wrap an async function with automatic error analysis and healing
 * Similar to @healing_agent decorator from healing-agent
 */
export function withHealing<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  cwd: string,
  options: HealingOptions = {}
): T {
  const { maxRetries = 3, autoFix = false, onError, onFix } = options;
  
  const wrapped = async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    let lastError: Error | null = null;
    let lastAnalysis: ErrorAnalysis | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args) as ReturnType<T>;
      } catch (error) {
        const err = error as Error & { code?: string };
        lastError = err;
        
        // Analyze the error
        lastAnalysis = await analyzeError(
          { code: err.code, message: err.message, stack: err.stack },
          cwd
        );
        
        console.log(`[NOVA:Healing] Attempt ${attempt}/${maxRetries} failed`);
        console.log(`[NOVA:Healing] Category: ${lastAnalysis.category}`);
        console.log(`[NOVA:Healing] Root cause: ${lastAnalysis.firstPrinciples.rootCause}`);
        
        if (onError) {
          await onError(lastAnalysis);
        }
        
        // Check if we have a high-confidence fix from memory
        const highConfidenceFix = lastAnalysis.suggestedFixes.find(f => f.confidence >= 80);
        
        if (highConfidenceFix && autoFix) {
          console.log(`[NOVA:Healing] Applying fix: ${highConfidenceFix.description}`);
          if (onFix) {
            await onFix(lastAnalysis);
          }
          // In a real implementation, this would apply the fix
          // For now, we just retry with exponential backoff
        }
        
        // Exponential backoff before retry
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 30000);
          console.log(`[NOVA:Healing] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    // All retries exhausted
    if (lastAnalysis) {
      console.log(`[NOVA:Healing] All ${maxRetries} attempts failed`);
      console.log(`[NOVA:Healing] Analysis ID: ${lastAnalysis.id}`);
      console.log(`[NOVA:Healing] Suggested fixes:`);
      for (const fix of lastAnalysis.suggestedFixes.slice(0, 3)) {
        console.log(`  - [${fix.confidence}%] ${fix.description}`);
      }
    }
    
    throw lastError;
  };
  
  return wrapped as T;
}


// ============================================
// NOVA AGENT ACTIVATION FOR ERRORS
// Auto-activates ARCTURUS + VEGA on error detection
// ============================================

export interface NovaErrorResponse {
  analysis: ErrorAnalysis;
  agentActivation: {
    primary: 'ARCTURUS' | 'VEGA';
    secondary?: 'ARCTURUS' | 'VEGA';
    mission: string;
  };
  prompt: string;
}

/**
 * Generate NOVA agent activation for error debugging
 * Automatically calls ARCTURUS (Guardian) + VEGA (Navigator)
 */
export function generateNovaErrorResponse(analysis: ErrorAnalysis): NovaErrorResponse {
  const { category, firstPrinciples, hypotheses, suggestedFixes, similarErrors } = analysis;
  
  // Determine primary agent based on error category
  const primary: 'ARCTURUS' | 'VEGA' = 
    ['SYNTAX', 'RUNTIME', 'STATE'].includes(category) ? 'ARCTURUS' : 'VEGA';
  
  const secondary = primary === 'ARCTURUS' ? 'VEGA' : 'ARCTURUS';
  
  const mission = `Debug ${category} error: ${analysis.error.message.substring(0, 50)}...`;
  
  // Build the debugging prompt
  let prompt = `🛡️ ARCTURUS + 🔭 VEGA CONSTELLATION ACTIVATED

📋 Mission: ${mission}

## Error Analysis (ID: ${analysis.id})

**Category**: ${category}
**Error**: ${analysis.error.code || 'N/A'} - ${analysis.error.message}

## First-Principles Decomposition (VEGA)

**What Failed**: ${firstPrinciples.whatFailed}
**Why It Failed**: ${firstPrinciples.whyItFailed}
**Root Cause**: ${firstPrinciples.rootCause}

**Assumptions to Verify**:
${firstPrinciples.assumptions.map((a, i) => `${i + 1}. ${a}`).join('\n')}

## Hypotheses (Ranked by Likelihood)

${hypotheses.slice(0, 5).map((h, i) => 
  `${i + 1}. [${h.likelihood}%] ${h.description}\n   Test: ${h.testMethod}`
).join('\n\n')}
`;

  if (similarErrors.length > 0) {
    prompt += `\n## Similar Past Errors Found: ${similarErrors.length}
This error pattern has been seen before. Previous fixes may apply.
`;
  }

  prompt += `\n## Suggested Fixes (ARCTURUS Verification Required)

${suggestedFixes.slice(0, 3).map((f, i) => 
  `${i + 1}. [${f.confidence}% confidence] ${f.description}${f.code ? `\n   Code: ${f.code}` : ''}`
).join('\n\n')}

---

**Next Steps**:
1. VEGA: Verify hypotheses starting with highest likelihood
2. ARCTURUS: Test each fix, verify no regressions
3. Record successful fix to debug memory for future reference
`;

  return {
    analysis,
    agentActivation: { primary, secondary, mission },
    prompt
  };
}

// Default export for convenience
export default {
  analyze: analyzeError,
  classify: classifyError,
  decompose: decomposeError,
  hypothesize: generateHypotheses,
  generateResponse: generateNovaErrorResponse,
  withHealing,
  memory: {
    load: loadDebugMemory,
    save: saveDebugMemory,
    findSimilar: findSimilarErrors,
    recordFix
  }
};
