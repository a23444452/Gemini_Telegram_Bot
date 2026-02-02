import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import {
  fileInfoTool,
  readFileTool,
  listDirectoryTool,
  writeFileTool,
  appendFileTool,
  deleteFileTool,
  createDirectoryTool,
  deleteDirectoryTool,
  moveFileTool,
  copyFileTool
} from '../../src/tools/fileOperations'
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

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true })
    } catch (error) {
      // Ignore cleanup errors
    }
  })

  describe('fileInfoTool', () => {
    it('should get file information successfully', async () => {
      const result = await fileInfoTool.execute({ path: 'test.txt' }, session)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data.type).toBe('file')
      expect(result.data.name).toBe('test.txt')
      expect(result.data.size).toBeGreaterThan(0)
      expect(result.data.sizeHuman).toBeDefined()
      expect(result.data.permissions).toBeDefined()
      expect(result.data.timestamps).toBeDefined()
      expect(result.data.timestamps.created).toBeDefined()
      expect(result.data.timestamps.modified).toBeDefined()
    })

    it('should get directory information with item count', async () => {
      const result = await fileInfoTool.execute({ path: 'subdir' }, session)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data.type).toBe('directory')
      expect(result.data.name).toBe('subdir')
      expect(result.data.itemCount).toBe(1) // Contains nested.txt
    })

    it('should format file size correctly', async () => {
      // Create a file with known size
      const testContent = 'x'.repeat(1500) // 1500 bytes
      await fs.writeFile(path.join(testDir, 'sized.txt'), testContent)

      const result = await fileInfoTool.execute({ path: 'sized.txt' }, session)

      expect(result.success).toBe(true)
      expect(result.data.size).toBe(1500)
      expect(result.data.sizeHuman).toContain('KB')
    })

    it('should include permissions in both formats', async () => {
      const result = await fileInfoTool.execute({ path: 'test.txt' }, session)

      expect(result.success).toBe(true)
      expect(result.data.permissions).toMatch(/^[r-][w-][x-][r-][w-][x-][r-][w-][x-]$/)
      expect(result.data.permissionsOctal).toMatch(/^\d{3}$/)
    })

    it('should fail for non-existent path', async () => {
      const result = await fileInfoTool.execute({ path: 'nonexistent.txt' }, session)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to get file info')
    })

    it('should block access outside allowed paths', async () => {
      const result = await fileInfoTool.execute({ path: '/etc/passwd' }, session)

      expect(result.success).toBe(false)
      expect(result.error).toContain('outside allowed paths')
    })

    it('should have correct metadata', () => {
      expect(fileInfoTool.name).toBe('file_info')
      expect(fileInfoTool.requiresConfirmation).toBe(false)
      expect(fileInfoTool.parameters.required).toContain('path')
    })
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

    it('should reject reading files larger than the size limit', async () => {
      // Create a file larger than 10MB (default limit)
      const largeContent = 'x'.repeat(11 * 1024 * 1024) // 11MB
      const largePath = path.join(testDir, 'large.txt')
      await fs.writeFile(largePath, largeContent)

      const result = await readFileTool.execute({ path: 'large.txt' }, session)

      expect(result.success).toBe(false)
      expect(result.error).toContain('File too large')
      expect(result.error).toContain('max:')
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

  describe('writeFileTool', () => {
    it('should write content to new file', async () => {
      const result = await writeFileTool.execute(
        { path: 'newfile.txt', content: 'New content' },
        session
      )

      expect(result.success).toBe(true)
      expect(result.data).toContain('written successfully')

      // Verify file was created with correct content
      const content = await fs.readFile(path.join(testDir, 'newfile.txt'), 'utf-8')
      expect(content).toBe('New content')
    })

    it('should overwrite existing file', async () => {
      const result = await writeFileTool.execute(
        { path: 'test.txt', content: 'Overwritten!' },
        session
      )

      expect(result.success).toBe(true)

      const content = await fs.readFile(path.join(testDir, 'test.txt'), 'utf-8')
      expect(content).toBe('Overwritten!')
    })

    it('should write file with absolute path', async () => {
      const absolutePath = path.join(testDir, 'absolute.txt')
      const result = await writeFileTool.execute(
        { path: absolutePath, content: 'Absolute path content' },
        session
      )

      expect(result.success).toBe(true)
      const content = await fs.readFile(absolutePath, 'utf-8')
      expect(content).toBe('Absolute path content')
    })

    it('should block write outside allowed paths', async () => {
      const result = await writeFileTool.execute(
        { path: '/etc/passwd', content: 'malicious' },
        session
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('outside allowed paths')
    })

    it('should block path traversal attempts', async () => {
      const result = await writeFileTool.execute(
        { path: '../../../etc/passwd', content: 'malicious' },
        session
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('outside allowed paths')
    })

    it('should create parent directories if needed', async () => {
      const result = await writeFileTool.execute(
        { path: 'deep/nested/file.txt', content: 'Deep content' },
        session
      )

      expect(result.success).toBe(true)
      const content = await fs.readFile(path.join(testDir, 'deep/nested/file.txt'), 'utf-8')
      expect(content).toBe('Deep content')
    })

    it('should reject writing content larger than the size limit', async () => {
      // Create content larger than 5MB (default limit)
      const largeContent = 'x'.repeat(6 * 1024 * 1024) // 6MB

      const result = await writeFileTool.execute(
        { path: 'large-write.txt', content: largeContent },
        session
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Content too large')
      expect(result.error).toContain('max:')
    })
  })

  describe('appendFileTool', () => {
    it('should append content to existing file', async () => {
      const result = await appendFileTool.execute(
        { path: 'test.txt', content: '\nAppended line' },
        session
      )

      expect(result.success).toBe(true)

      const content = await fs.readFile(path.join(testDir, 'test.txt'), 'utf-8')
      expect(content).toBe('Hello, world!\nAppended line')
    })

    it('should create new file if it does not exist', async () => {
      const result = await appendFileTool.execute(
        { path: 'newappend.txt', content: 'First line' },
        session
      )

      expect(result.success).toBe(true)

      const content = await fs.readFile(path.join(testDir, 'newappend.txt'), 'utf-8')
      expect(content).toBe('First line')
    })

    it('should block append outside allowed paths', async () => {
      const result = await appendFileTool.execute(
        { path: '/etc/passwd', content: 'malicious' },
        session
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('outside allowed paths')
    })

    it('should reject appending content larger than the content size limit', async () => {
      const largeContent = 'x'.repeat(6 * 1024 * 1024) // 6MB

      const result = await appendFileTool.execute(
        { path: 'append-test.txt', content: largeContent },
        session
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Content too large')
    })

    it('should reject appending if resulting file would be too large', async () => {
      // Create a file that's 9MB
      const existingContent = 'x'.repeat(9 * 1024 * 1024)
      await fs.writeFile(path.join(testDir, 'big-file.txt'), existingContent)

      // Try to append 2MB more (would result in 11MB, over 10MB limit)
      const appendContent = 'y'.repeat(2 * 1024 * 1024)

      const result = await appendFileTool.execute(
        { path: 'big-file.txt', content: appendContent },
        session
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Resulting file would be too large')
    })
  })

  describe('deleteFileTool', () => {
    it('should delete existing file', async () => {
      const result = await deleteFileTool.execute({ path: 'test.txt' }, session)

      expect(result.success).toBe(true)
      expect(result.data).toContain('deleted successfully')

      // Verify file was deleted
      try {
        await fs.access(path.join(testDir, 'test.txt'))
        throw new Error('File should not exist')
      } catch (error: any) {
        expect(error.code).toBe('ENOENT')
      }
    })

    it('should fail for non-existent file', async () => {
      const result = await deleteFileTool.execute({ path: 'nonexistent.txt' }, session)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to delete file')
    })

    it('should block delete outside allowed paths', async () => {
      const result = await deleteFileTool.execute({ path: '/etc/passwd' }, session)

      expect(result.success).toBe(false)
      expect(result.error).toContain('outside allowed paths')
    })
  })

  describe('createDirectoryTool', () => {
    it('should create new directory', async () => {
      const result = await createDirectoryTool.execute({ path: 'newdir' }, session)

      expect(result.success).toBe(true)
      expect(result.data).toContain('created successfully')

      // Verify directory was created
      const stats = await fs.stat(path.join(testDir, 'newdir'))
      expect(stats.isDirectory()).toBe(true)
    })

    it('should create nested directories recursively', async () => {
      const result = await createDirectoryTool.execute(
        { path: 'deep/nested/dirs' },
        session
      )

      expect(result.success).toBe(true)

      const stats = await fs.stat(path.join(testDir, 'deep/nested/dirs'))
      expect(stats.isDirectory()).toBe(true)
    })

    it('should succeed if directory already exists', async () => {
      const result = await createDirectoryTool.execute({ path: 'subdir' }, session)

      expect(result.success).toBe(true)
    })

    it('should block create outside allowed paths', async () => {
      const result = await createDirectoryTool.execute({ path: '/tmp/malicious' }, session)

      expect(result.success).toBe(false)
      expect(result.error).toContain('outside allowed paths')
    })
  })

  describe('deleteDirectoryTool', () => {
    it('should delete empty directory successfully', async () => {
      // Create an empty directory
      const emptyDir = path.join(testDir, 'empty-dir')
      await fs.mkdir(emptyDir)

      const result = await deleteDirectoryTool.execute({ path: 'empty-dir' }, session)

      expect(result.success).toBe(true)
      expect(result.data).toContain('deleted successfully')

      // Verify directory is deleted
      await expect(fs.access(emptyDir)).rejects.toThrow()
    })

    it('should refuse to delete non-empty directory without recursive flag', async () => {
      const result = await deleteDirectoryTool.execute({ path: 'subdir' }, session)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not empty')
      expect(result.error).toContain('recursive=true')
    })

    it('should delete non-empty directory with recursive=true', async () => {
      // Create a directory with files
      const testSubdir = path.join(testDir, 'to-delete')
      await fs.mkdir(testSubdir)
      await fs.writeFile(path.join(testSubdir, 'file1.txt'), 'content1')
      await fs.writeFile(path.join(testSubdir, 'file2.txt'), 'content2')
      await fs.mkdir(path.join(testSubdir, 'nested'))
      await fs.writeFile(path.join(testSubdir, 'nested', 'file3.txt'), 'content3')

      const result = await deleteDirectoryTool.execute(
        { path: 'to-delete', recursive: true },
        session
      )

      expect(result.success).toBe(true)

      // Verify directory and all contents are deleted
      await expect(fs.access(testSubdir)).rejects.toThrow()
    })

    it('should fail when trying to delete a file (not a directory)', async () => {
      const result = await deleteDirectoryTool.execute({ path: 'test.txt' }, session)

      expect(result.success).toBe(false)
      expect(result.error).toContain('not a directory')
    })

    it('should fail when trying to delete non-existent directory', async () => {
      const result = await deleteDirectoryTool.execute({ path: 'nonexistent-dir' }, session)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to delete directory')
    })

    it('should block delete outside allowed paths', async () => {
      const result = await deleteDirectoryTool.execute(
        { path: '/tmp/some-dir', recursive: true },
        session
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('outside allowed paths')
    })

    it('should have correct metadata', () => {
      expect(deleteDirectoryTool.name).toBe('delete_directory')
      expect(deleteDirectoryTool.requiresConfirmation).toBe(true)
      expect(deleteDirectoryTool.parameters.required).toContain('path')
    })
  })

  describe('moveFileTool', () => {
    it('should move file to new location', async () => {
      const result = await moveFileTool.execute(
        { source: 'test.txt', destination: 'moved.txt' },
        session
      )

      expect(result.success).toBe(true)
      expect(result.data).toContain('moved successfully')

      // Verify source is gone
      try {
        await fs.access(path.join(testDir, 'test.txt'))
        throw new Error('Source file should not exist')
      } catch (error: any) {
        expect(error.code).toBe('ENOENT')
      }

      // Verify destination exists
      const content = await fs.readFile(path.join(testDir, 'moved.txt'), 'utf-8')
      expect(content).toBe('Hello, world!')
    })

    it('should rename file (same directory)', async () => {
      const result = await moveFileTool.execute(
        { source: 'test.txt', destination: 'renamed.txt' },
        session
      )

      expect(result.success).toBe(true)

      const content = await fs.readFile(path.join(testDir, 'renamed.txt'), 'utf-8')
      expect(content).toBe('Hello, world!')
    })

    it('should move file to subdirectory', async () => {
      const result = await moveFileTool.execute(
        { source: 'test.txt', destination: 'subdir/test.txt' },
        session
      )

      expect(result.success).toBe(true)

      const content = await fs.readFile(path.join(testDir, 'subdir/test.txt'), 'utf-8')
      expect(content).toBe('Hello, world!')
    })

    it('should fail for non-existent source', async () => {
      const result = await moveFileTool.execute(
        { source: 'nonexistent.txt', destination: 'dest.txt' },
        session
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to move file')
    })

    it('should block move with source outside allowed paths', async () => {
      const result = await moveFileTool.execute(
        { source: '/etc/passwd', destination: 'hacked.txt' },
        session
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('outside allowed paths')
    })

    it('should block move with destination outside allowed paths', async () => {
      const result = await moveFileTool.execute(
        { source: 'test.txt', destination: '/tmp/malicious.txt' },
        session
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('outside allowed paths')
    })
  })

  describe('copyFileTool', () => {
    it('should copy file to new location', async () => {
      const result = await copyFileTool.execute(
        { source: 'test.txt', destination: 'copy.txt' },
        session
      )

      expect(result.success).toBe(true)
      expect(result.data).toContain('copied successfully')

      // Verify both files exist
      const originalContent = await fs.readFile(path.join(testDir, 'test.txt'), 'utf-8')
      const copiedContent = await fs.readFile(path.join(testDir, 'copy.txt'), 'utf-8')

      expect(originalContent).toBe('Hello, world!')
      expect(copiedContent).toBe('Hello, world!')
    })

    it('should copy file to subdirectory', async () => {
      const result = await copyFileTool.execute(
        { source: 'test.txt', destination: 'subdir/copy.txt' },
        session
      )

      expect(result.success).toBe(true)

      const content = await fs.readFile(path.join(testDir, 'subdir/copy.txt'), 'utf-8')
      expect(content).toBe('Hello, world!')
    })

    it('should overwrite existing file', async () => {
      await fs.writeFile(path.join(testDir, 'existing.txt'), 'Old content')

      const result = await copyFileTool.execute(
        { source: 'test.txt', destination: 'existing.txt' },
        session
      )

      expect(result.success).toBe(true)

      const content = await fs.readFile(path.join(testDir, 'existing.txt'), 'utf-8')
      expect(content).toBe('Hello, world!')
    })

    it('should fail for non-existent source', async () => {
      const result = await copyFileTool.execute(
        { source: 'nonexistent.txt', destination: 'copy.txt' },
        session
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to copy file')
    })

    it('should block copy with source outside allowed paths', async () => {
      const result = await copyFileTool.execute(
        { source: '/etc/passwd', destination: 'hacked.txt' },
        session
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('outside allowed paths')
    })

    it('should block copy with destination outside allowed paths', async () => {
      const result = await copyFileTool.execute(
        { source: 'test.txt', destination: '/tmp/malicious.txt' },
        session
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('outside allowed paths')
    })

    it('should reject copying files larger than the size limit', async () => {
      // Create a large file (11MB)
      const largeContent = 'x'.repeat(11 * 1024 * 1024)
      await fs.writeFile(path.join(testDir, 'large-source.txt'), largeContent)

      const result = await copyFileTool.execute(
        { source: 'large-source.txt', destination: 'large-copy.txt' },
        session
      )

      expect(result.success).toBe(false)
      expect(result.error).toContain('Source file too large')
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

    it('writeFileTool should have correct metadata', () => {
      expect(writeFileTool.name).toBe('write_file')
      expect(writeFileTool.description).toBeTruthy()
      expect(writeFileTool.requiresConfirmation).toBe(true)
      expect(writeFileTool.parameters.properties.path).toBeDefined()
      expect(writeFileTool.parameters.properties.content).toBeDefined()
    })

    it('appendFileTool should have correct metadata', () => {
      expect(appendFileTool.name).toBe('append_file')
      expect(appendFileTool.description).toBeTruthy()
      expect(appendFileTool.requiresConfirmation).toBe(true)
    })

    it('deleteFileTool should have correct metadata', () => {
      expect(deleteFileTool.name).toBe('delete_file')
      expect(deleteFileTool.description).toBeTruthy()
      expect(deleteFileTool.requiresConfirmation).toBe(true)
    })

    it('createDirectoryTool should have correct metadata', () => {
      expect(createDirectoryTool.name).toBe('create_directory')
      expect(createDirectoryTool.description).toBeTruthy()
      expect(createDirectoryTool.requiresConfirmation).toBe(true)
    })

    it('moveFileTool should have correct metadata', () => {
      expect(moveFileTool.name).toBe('move_file')
      expect(moveFileTool.description).toBeTruthy()
      expect(moveFileTool.requiresConfirmation).toBe(true)
      expect(moveFileTool.parameters.properties.source).toBeDefined()
      expect(moveFileTool.parameters.properties.destination).toBeDefined()
    })

    it('copyFileTool should have correct metadata', () => {
      expect(copyFileTool.name).toBe('copy_file')
      expect(copyFileTool.description).toBeTruthy()
      expect(copyFileTool.requiresConfirmation).toBe(true)
      expect(copyFileTool.parameters.properties.source).toBeDefined()
      expect(copyFileTool.parameters.properties.destination).toBeDefined()
    })
  })
})
