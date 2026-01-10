/**
 * NOVA File Summary System v1.0
 * Smart file summaries to prevent context burn
 * 
 * Problem: Reading full files burns 2K-5K tokens each
 * Solution: Extract symbols only (~100-200 tokens per file)
 * 
 * Based on: Aider's repo-map approach (January 2026 best practices)
 * 
 * @author VEGA Ξ172167
 */

export interface FileSymbol {
  name: string;
  type: 'class' | 'function' | 'interface' | 'type' | 'const' | 'export' | 'import';
  signature?: string;
  lineNumber: number;
}

export interface FileSummary {
  path: string;
  lines: number;
  imports: string[];
  exports: string[];
  classes: FileSymbol[];
  functions: FileSymbol[];
  interfaces: FileSymbol[];
  types: FileSymbol[];
  constants: FileSymbol[];
  tokenEstimate: number;
}

/**
 * Extract symbols from TypeScript/JavaScript file content
 * Uses regex-based extraction (lighter than tree-sitter)
 */
export function extractSymbols(content: string, path: string): FileSummary {
  const lines = content.split('\n');
  const imports: string[] = [];
  const exports: string[] = [];
  const classes: FileSymbol[] = [];
  const functions: FileSymbol[] = [];
  const interfaces: FileSymbol[] = [];
  const types: FileSymbol[] = [];
  const constants: FileSymbol[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Imports (first 10 only to save tokens)
    if (imports.length < 10 && /^import\s/.test(line)) {
      const match = line.match(/from\s+['"]([^'"]+)['"]/);
      if (match) {
        imports.push(match[1]);
      }
    }

    // Exports
    if (/^export\s+(default\s+)?/.test(line)) {
      const match = line.match(/export\s+(?:default\s+)?(?:async\s+)?(\w+)\s+(\w+)/);
      if (match) {
        exports.push(match[2]);
      }
    }

    // Classes
    const classMatch = line.match(/^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/);
    if (classMatch) {
      classes.push({
        name: classMatch[1],
        type: 'class',
        signature: line.trim().substring(0, 80),
        lineNumber: lineNum,
      });
    }

    // Interfaces
    const interfaceMatch = line.match(/^(?:export\s+)?interface\s+(\w+)/);
    if (interfaceMatch) {
      interfaces.push({
        name: interfaceMatch[1],
        type: 'interface',
        signature: line.trim().substring(0, 80),
        lineNumber: lineNum,
      });
    }

    // Type aliases
    const typeMatch = line.match(/^(?:export\s+)?type\s+(\w+)\s*=/);
    if (typeMatch) {
      types.push({
        name: typeMatch[1],
        type: 'type',
        lineNumber: lineNum,
      });
    }

    // Functions (named exports and declarations)
    const funcMatch = line.match(
      /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/
    );
    if (funcMatch) {
      functions.push({
        name: funcMatch[1],
        type: 'function',
        signature: `${funcMatch[1]}(${funcMatch[2].substring(0, 40)})`,
        lineNumber: lineNum,
      });
    }

    // Arrow functions assigned to const (export const foo = () => {})
    const arrowMatch = line.match(
      /^(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*\w+)?\s*=>/
    );
    if (arrowMatch) {
      functions.push({
        name: arrowMatch[1],
        type: 'function',
        lineNumber: lineNum,
      });
    }

    // Constants (export const FOO = ...)
    const constMatch = line.match(/^(?:export\s+)?const\s+([A-Z][A-Z0-9_]+)\s*=/);
    if (constMatch) {
      constants.push({
        name: constMatch[1],
        type: 'const',
        lineNumber: lineNum,
      });
    }
  }

  // Estimate tokens: ~4 chars per token
  const summaryText = formatFileSummary({
    path,
    lines: lines.length,
    imports,
    exports,
    classes,
    functions,
    interfaces,
    types,
    constants,
    tokenEstimate: 0,
  });

  return {
    path,
    lines: lines.length,
    imports,
    exports,
    classes,
    functions,
    interfaces,
    types,
    constants,
    tokenEstimate: Math.ceil(summaryText.length / 4),
  };
}

/**
 * Format file summary for display (human-readable)
 */
export function formatFileSummary(summary: FileSummary): string {
  const parts: string[] = [];

  parts.push(`📄 ${summary.path} (${summary.lines} lines)`);

  if (summary.imports.length > 0) {
    parts.push(`📦 Imports: ${summary.imports.slice(0, 5).join(', ')}${summary.imports.length > 5 ? '...' : ''}`);
  }

  if (summary.classes.length > 0) {
    parts.push(`🏛️ Classes: ${summary.classes.map(c => c.name).join(', ')}`);
  }

  if (summary.interfaces.length > 0) {
    parts.push(`📋 Interfaces: ${summary.interfaces.map(i => i.name).join(', ')}`);
  }

  if (summary.types.length > 0) {
    parts.push(`🔷 Types: ${summary.types.map(t => t.name).join(', ')}`);
  }

  if (summary.functions.length > 0) {
    const funcNames = summary.functions.slice(0, 10).map(f => f.name);
    parts.push(`⚡ Functions: ${funcNames.join(', ')}${summary.functions.length > 10 ? '...' : ''}`);
  }

  if (summary.exports.length > 0) {
    parts.push(`📤 Exports: ${summary.exports.slice(0, 8).join(', ')}${summary.exports.length > 8 ? '...' : ''}`);
  }

  parts.push(`\n💡 Ask for specific sections to see full code.`);

  return parts.join('\n');
}

/**
 * Format file summary for LLM context (compact)
 */
export function formatFileSummaryCompact(summary: FileSummary): string {
  const parts: string[] = [];

  parts.push(`${summary.path}:`);

  if (summary.classes.length > 0) {
    for (const c of summary.classes) {
      parts.push(`  class ${c.name} (L${c.lineNumber})`);
    }
  }

  if (summary.interfaces.length > 0) {
    for (const i of summary.interfaces) {
      parts.push(`  interface ${i.name} (L${i.lineNumber})`);
    }
  }

  if (summary.functions.length > 0) {
    for (const f of summary.functions.slice(0, 15)) {
      parts.push(`  fn ${f.signature || f.name} (L${f.lineNumber})`);
    }
    if (summary.functions.length > 15) {
      parts.push(`  ... +${summary.functions.length - 15} more functions`);
    }
  }

  return parts.join('\n');
}

/**
 * Summarize a file instead of reading full content
 * Returns summary if file is large, full content if small
 */
export function summarizeFileContent(
  content: string,
  path: string,
  maxLinesForFull = 100
): { summary: string; isSummary: boolean; tokenEstimate: number } {
  const lines = content.split('\n');

  // Small files: return full content
  if (lines.length <= maxLinesForFull) {
    return {
      summary: content,
      isSummary: false,
      tokenEstimate: Math.ceil(content.length / 4),
    };
  }

  // Large files: return summary
  const fileSummary = extractSymbols(content, path);
  return {
    summary: formatFileSummary(fileSummary),
    isSummary: true,
    tokenEstimate: fileSummary.tokenEstimate,
  };
}

/**
 * Estimate tokens for a string (rough: 1 token ≈ 4 chars)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Check if content would exceed token budget
 */
export function wouldExceedBudget(
  content: string,
  currentTokens: number,
  maxTokens: number
): boolean {
  const contentTokens = estimateTokens(content);
  return currentTokens + contentTokens > maxTokens;
}
