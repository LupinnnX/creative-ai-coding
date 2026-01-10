/**
 * NOVA Steering Loader Tests
 */
import { 
  buildAgentContext, 
  buildCognitiveLoopPrompt,
  buildHandoffProtocol,
  buildQuickActivation,
  createCognitiveLoopState,
  NOVA_AGENTS
} from './index';

describe('NOVA Steering Loader', () => {
  describe('buildAgentContext', () => {
    it('should build context for POLARIS', () => {
      const context = buildAgentContext('POLARIS');
      expect(context).toContain('POLARIS');
      expect(context).toContain('Ξ8890');
      expect(context).toContain('Strategic Commander');
      expect(context).toContain('orchestrate');
    });

    it('should build context for VEGA', () => {
      const context = buildAgentContext('VEGA');
      expect(context).toContain('VEGA');
      expect(context).toContain('Ξ172167');
      expect(context).toContain('Navigator');
      expect(context).toContain('first-principles');
    });

    it('should include VETO power for SIRIUS', () => {
      const context = buildAgentContext('SIRIUS');
      expect(context).toContain('VETO');
    });

    it('should include VETO power for ARCTURUS', () => {
      const context = buildAgentContext('ARCTURUS');
      expect(context).toContain('VETO');
    });

    it('should return empty string for invalid agent', () => {
      // @ts-expect-error Testing invalid input
      const context = buildAgentContext('INVALID');
      expect(context).toBe('');
    });
  });

  describe('buildCognitiveLoopPrompt', () => {
    it('should include all loop phases', () => {
      const prompt = buildCognitiveLoopPrompt();
      expect(prompt).toContain('META-PLAN');
      expect(prompt).toContain('DRAFT');
      expect(prompt).toContain('SELF-CORRECT');
      expect(prompt).toContain('CRITIQUE');
      expect(prompt).toContain('REFINE');
      expect(prompt).toContain('VERIFY');
      expect(prompt).toContain('CHECKPOINT');
    });

    it('should include reasoning modulation patterns', () => {
      const prompt = buildCognitiveLoopPrompt();
      expect(prompt).toContain('My approach');
      expect(prompt).toContain('confident');
      expect(prompt).toContain('trade-off');
    });
  });

  describe('buildHandoffProtocol', () => {
    it('should include handoff structure', () => {
      const protocol = buildHandoffProtocol();
      expect(protocol).toContain('HANDOFF');
      expect(protocol).toContain('WHAT I DID');
      expect(protocol).toContain('WHAT YOU NEED TO DO');
      expect(protocol).toContain('CONTEXT');
      expect(protocol).toContain('WATCH OUT FOR');
    });
  });

  describe('buildQuickActivation', () => {
    it('should build quick activation for POLARIS', () => {
      const activation = buildQuickActivation('POLARIS', 'Build auth system');
      expect(activation).toContain('POLARIS');
      expect(activation).toContain('Ξ8890');
      expect(activation).toContain('ACTIVATED');
      expect(activation).toContain('Build auth system');
      expect(activation).toContain('Antigravity Loop');
    });

    it('should return empty for invalid agent', () => {
      // @ts-expect-error Testing invalid input
      const activation = buildQuickActivation('INVALID', 'mission');
      expect(activation).toBe('');
    });
  });

  describe('createCognitiveLoopState', () => {
    it('should create initial state', () => {
      const state = createCognitiveLoopState();
      expect(state.phase).toBe('META_PLAN');
      expect(state.metaPlan).toBeNull();
      expect(state.draft).toBeNull();
      expect(state.selfCorrections).toEqual([]);
      expect(state.critiques).toEqual([]);
      expect(state.refinements).toEqual([]);
      expect(state.verified).toBe(false);
      expect(state.checkpoint).toBeNull();
    });
  });

  describe('NOVA_AGENTS', () => {
    it('should have all 6 agents', () => {
      expect(Object.keys(NOVA_AGENTS)).toHaveLength(6);
      expect(NOVA_AGENTS.POLARIS).toBeDefined();
      expect(NOVA_AGENTS.VEGA).toBeDefined();
      expect(NOVA_AGENTS.SIRIUS).toBeDefined();
      expect(NOVA_AGENTS.RIGEL).toBeDefined();
      expect(NOVA_AGENTS.ANTARES).toBeDefined();
      expect(NOVA_AGENTS.ARCTURUS).toBeDefined();
    });

    it('should have correct veto power assignments', () => {
      expect(NOVA_AGENTS.SIRIUS.hasVeto).toBe(true);
      expect(NOVA_AGENTS.ARCTURUS.hasVeto).toBe(true);
      expect(NOVA_AGENTS.POLARIS.hasVeto).toBe(false);
      expect(NOVA_AGENTS.VEGA.hasVeto).toBe(false);
      expect(NOVA_AGENTS.RIGEL.hasVeto).toBe(false);
      expect(NOVA_AGENTS.ANTARES.hasVeto).toBe(false);
    });

    it('should have unique IDs', () => {
      const ids = Object.values(NOVA_AGENTS).map(a => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(6);
    });
  });
});
