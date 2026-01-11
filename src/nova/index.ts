/**
 * NOVA Framework v7.0 - Main Export
 * Agent Coordination System
 * 
 * Enhanced with Self-Healing Error Debugger v1.0
 * Enhanced with Reflexion Loop v7.0 (Self-Improvement)
 * Enhanced with Activation Profiles v7.0 (Steering)
 * Enhanced with Context Burn Prevention v1.0
 * 
 * Research: Kodezi Chronos, SWE-Agent, OpenHands, Healing-Agent, Reflexion, RepE/CAE
 */

export * from './types';
export * from './steering-loader';
export * from './steering-lite';
export * from './error-debugger';
export * from './reflexion';
export * from './activation-profiles';

// Context budget - selective exports to avoid conflicts with steering-lite
export {
  ContextBudget as ContextBudgetTracker,
  BudgetConfig,
  createContextBudget,
  canReadFile,
  recordFileRead,
  recordUserMessage,
  isInWarningZone,
  isCritical,
  formatBudget,
  formatBudgetCompact,
  AUDIT_PATTERNS,
  isAuditRequest,
  getAuditInterceptionMessage,
} from './context-budget';

// File summary - selective exports to avoid conflicts
export {
  FileSymbol,
  FileSummary,
  extractSymbols,
  formatFileSummary,
  formatFileSummaryCompact,
  summarizeFileContent,
  wouldExceedBudget,
} from './file-summary';
