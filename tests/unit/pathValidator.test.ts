import { describe, expect, it, beforeEach } from 'bun:test';
import { validatePath } from '../../src/permissions/pathValidator';
import type { UserSession } from '../../src/types/session';
import path from 'path';
import os from 'os';

describe('pathValidator', () => {
  let mockSession: UserSession;
  const homeDir = os.homedir();
  const allowedDir = path.join(homeDir, 'Documents');

  beforeEach(() => {
    mockSession = {
      userId: 123,
      currentWorkingDir: allowedDir,
      allowedPaths: [allowedDir, path.join(homeDir, 'Downloads')],
      geminiContext: [],
      lastActivity: new Date(),
    };
  });

  describe('Valid paths', () => {
    it('should accept path within allowed directory', () => {
      const testPath = path.join(allowedDir, 'project');
      const result = validatePath(testPath, mockSession);

      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should accept current working directory', () => {
      const result = validatePath(mockSession.currentWorkingDir, mockSession);

      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBe(mockSession.currentWorkingDir);
    });

    it('should accept relative path within allowed directory', () => {
      const result = validatePath('./subdir', mockSession);

      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toContain(allowedDir);
    });

    it('should accept subdirectories of allowed paths', () => {
      const deepPath = path.join(allowedDir, 'level1', 'level2', 'level3');
      const result = validatePath(deepPath, mockSession);

      expect(result.valid).toBe(true);
      expect(result.resolvedPath).toBe(deepPath);
    });
  });

  describe('Path traversal attacks', () => {
    it('should reject path traversal with ../', () => {
      const maliciousPath = path.join(allowedDir, '..', '..', 'etc', 'passwd');
      const result = validatePath(maliciousPath, mockSession);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('outside allowed paths');
    });

    it('should reject absolute path outside allowed paths', () => {
      const result = validatePath('/etc/passwd', mockSession);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('outside allowed paths');
    });

    it('should reject relative path escaping to parent', () => {
      mockSession.currentWorkingDir = path.join(allowedDir, 'subdir');
      const result = validatePath('../../..', mockSession);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('outside allowed paths');
    });
  });

  describe('Sensitive file protection', () => {
    it('should reject .env file access within allowed directory', () => {
      const envPath = path.join(allowedDir, '.env');
      const result = validatePath(envPath, mockSession);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('sensitive');
    });

    it('should reject .env.local file access', () => {
      const envPath = path.join(allowedDir, 'project', '.env.local');
      const result = validatePath(envPath, mockSession);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('sensitive');
    });

    it('should reject files with "secret" in name', () => {
      const secretPath = path.join(allowedDir, 'my-secret-key.txt');
      const result = validatePath(secretPath, mockSession);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('sensitive');
    });

    it('should reject files with "credential" in name', () => {
      const credPath = path.join(allowedDir, 'aws-credentials.json');
      const result = validatePath(credPath, mockSession);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('sensitive');
    });

    it('should reject .npmrc file', () => {
      const npmrcPath = path.join(allowedDir, '.npmrc');
      const result = validatePath(npmrcPath, mockSession);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('sensitive');
    });

    it('should reject SSH directory even outside allowed paths', () => {
      const sshKeyPath = path.join(homeDir, '.ssh', 'id_rsa');
      const result = validatePath(sshKeyPath, mockSession);

      expect(result.valid).toBe(false);
      // Will fail on allowedPaths check first, which is correct
      expect(result.error).toBeDefined();
    });
  });

  describe('Edge cases', () => {
    it('should handle empty path', () => {
      const result = validatePath('', mockSession);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should handle whitespace path', () => {
      const result = validatePath('   ', mockSession);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });

    it('should normalize paths with multiple slashes', () => {
      const weirdPath = path.join(allowedDir, 'subdir//nested///file');
      const result = validatePath(weirdPath, mockSession);

      expect(result.valid).toBe(true);
      expect(result.resolvedPath).not.toContain('//');
    });
  });
});
