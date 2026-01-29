import { describe, it, expect, beforeEach } from 'bun:test'
import { readFileTool, listDirectoryTool } from '../../src/tools/fileOperations'
import type { UserSession } from '../../src/types/session'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

describe('File Operations Tools', () => {
  let testDir: string
  let session: UserSession

  beforeEach(async () => {
    // Create temporary test directory
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'gemini-bot-test-'))

    // Resolve real path to handle symlinks (e.g., /var -> /private/var on macOS)
    testDir = await fs.realpath(testDir)

    session = {
      userId: 123,
      currentWorkingDir: testDir,
      allowedPaths: [testDir],
      geminiContext: [],
      lastActivity: new Date()
    }

    // Create test files
    await fs.writeFile(path.join(testDir, 'test.txt'), 'Hello, world!')
    await fs.mkdir(path.join(testDir, 'subdir'))
    await fs.writeFile(path.join(testDir, 'subdir', 'nested.txt'), 'Nested content')
  })

  describe('readFileTool', () => {
    it('should read file contents successfully', async () => {
      const result = await readFileTool.execute({ path: 'test.txt' }, session)

      expect(result.success).toBe(true)
      expect(result.data).toBe('Hello, world!')
    })

    it('should read nested file with relative path', async () => {
      const result = await readFileTool.execute({ path: 'subdir/nested.txt' }, session)

      expect(result.success).toBe(true)
      expect(result.data).toBe('Nested content')
    })

    it('should read file with absolute path', async () => {
      const absolutePath = path.join(testDir, 'test.txt')
      const result = await readFileTool.execute({ path: absolutePath }, session)

      expect(result.success).toBe(true)
      expect(result.data).toBe('Hello, world!')
    })

    it('should fail for non-existent file', async () => {
      const result = await readFileTool.execute({ path: 'nonexistent.txt' }, session)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to read file')
    })

    it('should fail for directory path', async () => {
      const result = await readFileTool.execute({ path: 'subdir' }, session)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Path is not a file')
    })

    it('should block access outside allowed paths', async () => {
      const result = await readFileTool.execute({ path: '/etc/passwd' }, session)

      expect(result.success).toBe(false)
      expect(result.error).toContain('outside allowed paths')
    })

    it('should block path traversal attempts', async () => {
      const result = await readFileTool.execute({ path: '../../../etc/passwd' }, session)

      expect(result.success).toBe(false)
      expect(result.error).toContain('outside allowed paths')
    })
  })

  describe('listDirectoryTool', () => {
    it('should list directory contents', async () => {
      const result = await listDirectoryTool.execute({ path: '.' }, session)

      expect(result.success).toBe(true)
      expect(result.data.path).toBe(testDir)
      expect(result.data.entries).toHaveLength(2)

      const names = result.data.entries.map((e: any) => e.name).sort()
      expect(names).toEqual(['subdir', 'test.txt'])
    })

    it('should identify file and directory types', async () => {
      const result = await listDirectoryTool.execute({ path: '.' }, session)

      expect(result.success).toBe(true)

      const entries = result.data.entries
      const testFile = entries.find((e: any) => e.name === 'test.txt')
      const subDir = entries.find((e: any) => e.name === 'subdir')

      expect(testFile.type).toBe('file')
      expect(subDir.type).toBe('dir')
    })

    it('should list subdirectory contents', async () => {
      const result = await listDirectoryTool.execute({ path: 'subdir' }, session)

      expect(result.success).toBe(true)
      expect(result.data.entries).toHaveLength(1)
      expect(result.data.entries[0].name).toBe('nested.txt')
    })

    it('should work with absolute path', async () => {
      const result = await listDirectoryTool.execute({ path: testDir }, session)

      expect(result.success).toBe(true)
      expect(result.data.entries).toHaveLength(2)
    })

    it('should fail for file path', async () => {
      const result = await listDirectoryTool.execute({ path: 'test.txt' }, session)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Path is not a directory')
    })

    it('should fail for non-existent directory', async () => {
      const result = await listDirectoryTool.execute({ path: 'nonexistent' }, session)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to list directory')
    })

    it('should block access outside allowed paths', async () => {
      const result = await listDirectoryTool.execute({ path: '/etc' }, session)

      expect(result.success).toBe(false)
      expect(result.error).toContain('outside allowed paths')
    })
  })

  describe('tool metadata', () => {
    it('readFileTool should have correct metadata', () => {
      expect(readFileTool.name).toBe('read_file')
      expect(readFileTool.description).toBeTruthy()
      expect(readFileTool.requiresConfirmation).toBe(false)
      expect(readFileTool.parameters.properties.path).toBeDefined()
    })

    it('listDirectoryTool should have correct metadata', () => {
      expect(listDirectoryTool.name).toBe('list_directory')
      expect(listDirectoryTool.description).toBeTruthy()
      expect(listDirectoryTool.requiresConfirmation).toBe(false)
      expect(listDirectoryTool.parameters.properties.path).toBeDefined()
    })
  })
})
