/**
 * NOVA Error Debugger Tests
 * Tests for the self-healing error analysis system
 */
import { describe, it, expect } from '@jest/globals';
import {
  classifyError,
  decomposeError,
  generateHypotheses,
  generateErrorSignature,
  analyzeError,
  generateNovaErrorResponse
} from './error-debugger';

describe('Error Debugger', () => {
  describe('classifyError', () => {
    it('should classify network errors correctly', () => {
      expect(classifyError({ code: 'ETIMEDOUT', message: 'Connection timed out' })).toBe('NETWORK');
      expect(classifyError({ code: 'ECONNRESET', message: 'Connection reset' })).toBe('NETWORK');
      expect(classifyError({ code: 'ENOTFOUND', message: 'getaddrinfo failed' })).toBe('NETWORK');
    });

    it('should classify auth errors correctly', () => {
      expect(classifyError({ message: '401 Unauthorized' })).toBe('AUTH');
      expect(classifyError({ message: '403 Forbidden access denied' })).toBe('AUTH');
      expect(classifyError({ message: 'Invalid token' })).toBe('AUTH');
    });

    it('should classify syntax errors correctly', () => {
      expect(classifyError({ message: 'SyntaxError: Unexpected token' })).toBe('SYNTAX');
      expect(classifyError({ message: 'TypeError: x is not a function' })).toBe('SYNTAX');
    });


    it('should classify resource errors correctly', () => {
      expect(classifyError({ code: 'ENOENT', message: 'No such file' })).toBe('RESOURCE');
      expect(classifyError({ code: 'EPERM', message: 'Permission denied' })).toBe('RESOURCE');
    });

    it('should classify config errors correctly', () => {
      expect(classifyError({ message: 'Environment variable not set' })).toBe('CONFIG');
    });

    it('should classify dependency errors correctly', () => {
      expect(classifyError({ code: 'MODULE_NOT_FOUND', message: 'Cannot find module' })).toBe('DEPENDENCY');
    });

    it('should return UNKNOWN for unrecognized errors', () => {
      expect(classifyError({ message: 'Some random error' })).toBe('UNKNOWN');
    });
  });

  describe('decomposeError', () => {
    it('should decompose network errors with first principles', () => {
      const decomposition = decomposeError({ message: 'ETIMEDOUT' }, 'NETWORK');
      
      expect(decomposition.whatFailed).toContain('Network');
      expect(decomposition.assumptions.length).toBeGreaterThan(0);
      expect(decomposition.rootCause).toBeTruthy();
    });

    it('should decompose auth errors with first principles', () => {
      const decomposition = decomposeError({ message: '401' }, 'AUTH');
      
      expect(decomposition.whatFailed).toContain('Authentication');
      expect(decomposition.assumptions).toContain('Token/credentials are valid');
    });
  });

  describe('generateHypotheses', () => {
    it('should generate hypotheses for network errors', () => {
      const hypotheses = generateHypotheses({ message: 'ETIMEDOUT' }, 'NETWORK');
      
      expect(hypotheses.length).toBeGreaterThan(0);
      expect(hypotheses[0].likelihood).toBeGreaterThan(0);
      expect(hypotheses[0].testMethod).toBeTruthy();
    });

    it('should rank hypotheses by likelihood', () => {
      const hypotheses = generateHypotheses({ message: 'ETIMEDOUT' }, 'NETWORK');
      
      // First hypothesis should have highest likelihood
      for (let i = 1; i < hypotheses.length; i++) {
        expect(hypotheses[0].likelihood).toBeGreaterThanOrEqual(hypotheses[i].likelihood);
      }
    });
  });

  describe('generateErrorSignature', () => {
    it('should normalize error messages', () => {
      const sig1 = generateErrorSignature({ code: 'ENOENT', message: 'File /path/to/file.txt not found' });
      const sig2 = generateErrorSignature({ code: 'ENOENT', message: 'File /different/path.js not found' });
      
      // Both should have same signature since paths are normalized
      expect(sig1).toBe(sig2);
    });

    it('should normalize numbers in messages', () => {
      const sig1 = generateErrorSignature({ message: 'Error at line 42' });
      const sig2 = generateErrorSignature({ message: 'Error at line 100' });
      
      expect(sig1).toBe(sig2);
    });
  });

  describe('analyzeError', () => {
    it('should produce complete analysis', async () => {
      const analysis = await analyzeError(
        { code: 'ETIMEDOUT', message: 'Connection timed out to api.example.com' },
        '/tmp/test'
      );
      
      expect(analysis.id).toMatch(/^ERR-/);
      expect(analysis.category).toBe('NETWORK');
      expect(analysis.firstPrinciples).toBeTruthy();
      expect(analysis.hypotheses.length).toBeGreaterThan(0);
      expect(analysis.suggestedFixes.length).toBeGreaterThan(0);
    });
  });

  describe('generateNovaErrorResponse', () => {
    it('should generate NOVA agent activation', async () => {
      const analysis = await analyzeError(
        { code: 'ETIMEDOUT', message: 'Connection timed out' },
        '/tmp/test'
      );
      
      const response = generateNovaErrorResponse(analysis);
      
      expect(response.agentActivation.primary).toBe('VEGA'); // NETWORK errors go to VEGA
      expect(response.agentActivation.secondary).toBe('ARCTURUS');
      expect(response.prompt).toContain('ARCTURUS');
      expect(response.prompt).toContain('VEGA');
      expect(response.prompt).toContain('First-Principles');
    });

    it('should activate ARCTURUS for syntax errors', async () => {
      const analysis = await analyzeError(
        { message: 'SyntaxError: Unexpected token' },
        '/tmp/test'
      );
      
      const response = generateNovaErrorResponse(analysis);
      
      expect(response.agentActivation.primary).toBe('ARCTURUS'); // SYNTAX errors go to ARCTURUS
    });
  });
});
