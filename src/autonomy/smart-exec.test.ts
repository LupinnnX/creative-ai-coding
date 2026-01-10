/**
 * Tests for Smart Execution Module
 * 
 * NOVA Framework v6.0 - ARCTURUS Quality Assurance
 */

import {
  FULL_AUTONOMY_ALLOWLIST,
  ABSOLUTE_BLOCKLIST,
  COMMAND_TEMPLATES,
  listTemplates,
} from './smart-exec';

describe('FULL_AUTONOMY_ALLOWLIST', () => {
  it('should include common package managers', () => {
    expect(FULL_AUTONOMY_ALLOWLIST).toContain('npm');
    expect(FULL_AUTONOMY_ALLOWLIST).toContain('yarn');
    expect(FULL_AUTONOMY_ALLOWLIST).toContain('pnpm');
    expect(FULL_AUTONOMY_ALLOWLIST).toContain('bun');
  });

  it('should include file operations', () => {
    expect(FULL_AUTONOMY_ALLOWLIST).toContain('rm');
    expect(FULL_AUTONOMY_ALLOWLIST).toContain('mkdir');
    expect(FULL_AUTONOMY_ALLOWLIST).toContain('cp');
    expect(FULL_AUTONOMY_ALLOWLIST).toContain('mv');
  });

  it('should include git commands', () => {
    expect(FULL_AUTONOMY_ALLOWLIST).toContain('git');
    expect(FULL_AUTONOMY_ALLOWLIST).toContain('gh');
  });

  it('should include build tools', () => {
    expect(FULL_AUTONOMY_ALLOWLIST).toContain('make');
    expect(FULL_AUTONOMY_ALLOWLIST).toContain('cargo');
    expect(FULL_AUTONOMY_ALLOWLIST).toContain('go');
  });

  it('should include testing tools', () => {
    expect(FULL_AUTONOMY_ALLOWLIST).toContain('jest');
    expect(FULL_AUTONOMY_ALLOWLIST).toContain('vitest');
    expect(FULL_AUTONOMY_ALLOWLIST).toContain('pytest');
  });
});

describe('ABSOLUTE_BLOCKLIST', () => {
  it('should block dangerous rm commands', () => {
    expect(ABSOLUTE_BLOCKLIST).toContain('rm -rf /');
    expect(ABSOLUTE_BLOCKLIST).toContain('rm -rf /*');
    expect(ABSOLUTE_BLOCKLIST).toContain('rm -rf ~');
    expect(ABSOLUTE_BLOCKLIST).toContain('sudo rm');
  });

  it('should block system commands', () => {
    expect(ABSOLUTE_BLOCKLIST).toContain('shutdown');
    expect(ABSOLUTE_BLOCKLIST).toContain('reboot');
    expect(ABSOLUTE_BLOCKLIST).toContain('halt');
  });

  it('should block disk operations', () => {
    expect(ABSOLUTE_BLOCKLIST).toContain('mkfs');
    expect(ABSOLUTE_BLOCKLIST).toContain('dd if=');
  });

  it('should block privilege escalation', () => {
    expect(ABSOLUTE_BLOCKLIST).toContain('sudo su');
    expect(ABSOLUTE_BLOCKLIST).toContain('sudo -i');
    expect(ABSOLUTE_BLOCKLIST).toContain('sudo bash');
  });
});

describe('COMMAND_TEMPLATES', () => {
  it('should have nextjs-clean template', () => {
    expect(COMMAND_TEMPLATES['nextjs-clean']).toBeDefined();
    expect(COMMAND_TEMPLATES['nextjs-clean']).toContain('rm -rf .next');
    expect(COMMAND_TEMPLATES['nextjs-clean']).toContain('npm run build');
  });

  it('should have nextjs-export template', () => {
    expect(COMMAND_TEMPLATES['nextjs-export']).toBeDefined();
    expect(COMMAND_TEMPLATES['nextjs-export']).toContain('rm -rf .next');
    expect(COMMAND_TEMPLATES['nextjs-export']).toContain('rm -rf out');
    expect(COMMAND_TEMPLATES['nextjs-export']).toContain('npm run export');
  });

  it('should have npm-fresh template', () => {
    expect(COMMAND_TEMPLATES['npm-fresh']).toBeDefined();
    expect(COMMAND_TEMPLATES['npm-fresh']).toContain('rm -rf node_modules');
    expect(COMMAND_TEMPLATES['npm-fresh']).toContain('npm install');
  });

  it('should have yarn-fresh template', () => {
    expect(COMMAND_TEMPLATES['yarn-fresh']).toBeDefined();
    expect(COMMAND_TEMPLATES['yarn-fresh']).toContain('rm -rf node_modules');
    expect(COMMAND_TEMPLATES['yarn-fresh']).toContain('yarn install');
  });

  it('should have git-clean template', () => {
    expect(COMMAND_TEMPLATES['git-clean']).toBeDefined();
    expect(COMMAND_TEMPLATES['git-clean']).toContain('git clean -fd');
  });

  it('should have docker-clean template', () => {
    expect(COMMAND_TEMPLATES['docker-clean']).toBeDefined();
    expect(COMMAND_TEMPLATES['docker-clean']).toContain('docker system prune -f');
  });
});

describe('listTemplates', () => {
  it('should return formatted template list', () => {
    const output = listTemplates();
    
    expect(output).toContain('Available Command Templates');
    expect(output).toContain('nextjs-clean');
    expect(output).toContain('npm-fresh');
    expect(output).toContain('/exec-template');
  });

  it('should show commands for each template', () => {
    const output = listTemplates();
    
    expect(output).toContain('rm -rf .next');
    expect(output).toContain('npm run build');
  });
});

// Integration tests would require mocking exec
// These are unit tests for the configuration and templates
