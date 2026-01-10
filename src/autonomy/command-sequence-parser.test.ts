/**
 * Tests for Command Sequence Parser
 * 
 * NOVA Framework v6.0 - ARCTURUS Quality Assurance
 */

import {
  parseCommandSequence,
  extractCommandsFromMessage,
  validateCommands,
  formatCommandSequence,
} from './command-sequence-parser';

describe('parseCommandSequence', () => {
  describe('numbered format with dots', () => {
    it('should parse "1. cmd 2. cmd 3. cmd" format', () => {
      const input = '1. rm -rf .next 2. rm -rf node_modules/.cache 3. npm run build';
      const result = parseCommandSequence(input);
      
      expect(result.totalCount).toBe(3);
      expect(result.commands[0].command).toBe('rm -rf .next');
      expect(result.commands[1].command).toBe('rm -rf node_modules/.cache');
      expect(result.commands[2].command).toBe('npm run build');
    });

    it('should parse multiline numbered format', () => {
      const input = `1. rm -rf .next
2. rm -rf node_modules/.cache
3. npm run build`;
      const result = parseCommandSequence(input);
      
      expect(result.totalCount).toBe(3);
      expect(result.commands[0].command).toBe('rm -rf .next');
      expect(result.commands[2].command).toBe('npm run build');
    });

    it('should parse with descriptions', () => {
      const input = '1. Clear cache: rm -rf .next 2. Rebuild: npm run build';
      const result = parseCommandSequence(input);
      
      expect(result.totalCount).toBe(2);
      expect(result.hasDescriptions).toBe(true);
      expect(result.commands[0].description).toBe('Clear cache');
      expect(result.commands[0].command).toBe('rm -rf .next');
      expect(result.commands[1].description).toBe('Rebuild');
      expect(result.commands[1].command).toBe('npm run build');
    });
  });

  describe('numbered format with parentheses', () => {
    it('should parse "1) cmd 2) cmd" format', () => {
      const input = '1) npm install 2) npm run build 3) npm run test';
      const result = parseCommandSequence(input);
      
      expect(result.totalCount).toBe(3);
      expect(result.commands[0].command).toBe('npm install');
      expect(result.commands[1].command).toBe('npm run build');
      expect(result.commands[2].command).toBe('npm run test');
    });
  });

  describe('step format', () => {
    it('should parse "Step N: cmd" format', () => {
      const input = 'Step 1: npm install Step 2: npm run build Step 3: npm test';
      const result = parseCommandSequence(input);
      
      expect(result.totalCount).toBe(3);
      expect(result.commands[0].command).toBe('npm install');
      expect(result.commands[1].command).toBe('npm run build');
      expect(result.commands[2].command).toBe('npm test');
    });
  });

  describe('bullet format', () => {
    it('should parse bullet points', () => {
      const input = `- npm install
- npm run build
- npm test`;
      const result = parseCommandSequence(input);
      
      expect(result.totalCount).toBe(3);
      expect(result.commands[0].command).toBe('npm install');
      expect(result.commands[1].command).toBe('npm run build');
      expect(result.commands[2].command).toBe('npm test');
    });
  });

  describe('command cleaning', () => {
    it('should remove trailing comments', () => {
      const input = '1. rm -rf .next # clear cache 2. npm run build';
      const result = parseCommandSequence(input);
      
      expect(result.commands[0].command).toBe('rm -rf .next');
    });

    it('should remove trailing parenthetical notes', () => {
      const input = '1. npm run build (rebuilds the app) 2. npm test';
      const result = parseCommandSequence(input);
      
      expect(result.commands[0].command).toBe('npm run build');
    });

    it('should handle "to rebuild" descriptions', () => {
      const input = '1. npm run export to rebuild 2. npm test';
      const result = parseCommandSequence(input);
      
      expect(result.commands[0].command).toBe('npm run export');
    });
  });

  describe('edge cases', () => {
    it('should return empty for no commands', () => {
      const result = parseCommandSequence('Hello world');
      expect(result.totalCount).toBe(0);
    });

    it('should handle empty input', () => {
      const result = parseCommandSequence('');
      expect(result.totalCount).toBe(0);
    });

    it('should sort by index', () => {
      const input = '3. third 1. first 2. second';
      const result = parseCommandSequence(input);
      
      expect(result.commands[0].index).toBe(1);
      expect(result.commands[1].index).toBe(2);
      expect(result.commands[2].index).toBe(3);
    });
  });
});

describe('extractCommandsFromMessage', () => {
  it('should extract commands from code blocks', () => {
    const input = `Here are the commands:
\`\`\`bash
rm -rf .next
npm run build
\`\`\``;
    const result = extractCommandsFromMessage(input);
    
    expect(result.totalCount).toBe(2);
    expect(result.commands[0].command).toBe('rm -rf .next');
    expect(result.commands[1].command).toBe('npm run build');
  });

  it('should skip comments in code blocks', () => {
    const input = `\`\`\`bash
# This is a comment
npm install
// Another comment
npm run build
\`\`\``;
    const result = extractCommandsFromMessage(input);
    
    expect(result.totalCount).toBe(2);
    expect(result.commands[0].command).toBe('npm install');
    expect(result.commands[1].command).toBe('npm run build');
  });

  it('should prefer numbered format over code blocks', () => {
    const input = `1. npm install 2. npm run build

\`\`\`bash
echo "ignored"
\`\`\``;
    const result = extractCommandsFromMessage(input);
    
    expect(result.totalCount).toBe(2);
    expect(result.commands[0].command).toBe('npm install');
  });
});

describe('validateCommands', () => {
  const allowlist = ['npm', 'yarn', 'node', 'git', 'rm', 'mkdir'];

  it('should validate allowed commands', () => {
    const commands = [
      { index: 1, raw: 'npm install', command: 'npm install' },
      { index: 2, raw: 'rm -rf .next', command: 'rm -rf .next' },
    ];
    
    const { valid, invalid } = validateCommands(commands, allowlist);
    
    expect(valid.length).toBe(2);
    expect(invalid.length).toBe(0);
  });

  it('should reject commands not in allowlist', () => {
    const commands = [
      { index: 1, raw: 'npm install', command: 'npm install' },
      { index: 2, raw: 'sudo rm -rf /', command: 'sudo rm -rf /' },
    ];
    
    const { valid, invalid } = validateCommands(commands, allowlist);
    
    expect(valid.length).toBe(1);
    expect(invalid.length).toBe(1);
    expect(invalid[0].command).toBe('sudo rm -rf /');
  });

  it('should handle path-based commands', () => {
    const commands = [
      { index: 1, raw: '/usr/bin/npm install', command: '/usr/bin/npm install' },
    ];
    
    const { valid, invalid } = validateCommands(commands, allowlist);
    
    expect(valid.length).toBe(1);
  });
});

describe('formatCommandSequence', () => {
  it('should format command sequence for display', () => {
    const sequence = {
      commands: [
        { index: 1, raw: 'npm install', command: 'npm install' },
        { index: 2, raw: 'npm run build', command: 'npm run build' },
      ],
      totalCount: 2,
      hasDescriptions: false,
    };
    
    const output = formatCommandSequence(sequence);
    
    expect(output).toContain('2 commands');
    expect(output).toContain('`npm install`');
    expect(output).toContain('`npm run build`');
  });

  it('should include descriptions when present', () => {
    const sequence = {
      commands: [
        { index: 1, raw: 'Install: npm install', command: 'npm install', description: 'Install' },
      ],
      totalCount: 1,
      hasDescriptions: true,
    };
    
    const output = formatCommandSequence(sequence);
    
    expect(output).toContain('Install:');
  });

  it('should handle empty sequence', () => {
    const sequence = {
      commands: [],
      totalCount: 0,
      hasDescriptions: false,
    };
    
    const output = formatCommandSequence(sequence);
    
    expect(output).toContain('No commands found');
  });
});
