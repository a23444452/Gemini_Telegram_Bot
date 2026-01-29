import { describe, it, expect, beforeEach } from 'bun:test'
import { ToolRegistry } from '../../src/gemini/tools'
import type { Tool } from '../../src/types/tool'
import type { UserSession } from '../../src/types/session'

describe('ToolRegistry', () => {
  let registry: ToolRegistry
  let mockSession: UserSession

  beforeEach(() => {
    registry = new ToolRegistry()
    mockSession = {
      userId: 123,
      currentWorkingDir: '/test/dir',
      allowedPaths: ['/test'],
      geminiContext: [],
      lastActivity: new Date()
    }
  })

  describe('registerTool', () => {
    it('should register a tool successfully', () => {
      const testTool: Tool = {
        name: 'test_tool',
        description: 'A test tool',
        parameters: {
          type: 'object',
          properties: {
            input: { type: 'string' }
          }
        },
        requiresConfirmation: false,
        execute: async () => ({ success: true, data: 'result' })
      }

      registry.registerTool(testTool)
      const retrieved = registry.getTool('test_tool')

      expect(retrieved).toBeDefined()
      expect(retrieved?.name).toBe('test_tool')
    })

    it('should allow registering multiple tools', () => {
      const tool1: Tool = {
        name: 'tool1',
        description: 'Tool 1',
        parameters: {},
        requiresConfirmation: false,
        execute: async () => ({ success: true })
      }

      const tool2: Tool = {
        name: 'tool2',
        description: 'Tool 2',
        parameters: {},
        requiresConfirmation: false,
        execute: async () => ({ success: true })
      }

      registry.registerTool(tool1)
      registry.registerTool(tool2)

      expect(registry.getTool('tool1')).toBeDefined()
      expect(registry.getTool('tool2')).toBeDefined()
    })
  })

  describe('getTool', () => {
    it('should return undefined for non-existent tool', () => {
      const result = registry.getTool('non_existent')
      expect(result).toBeUndefined()
    })

    it('should return the correct tool', () => {
      const testTool: Tool = {
        name: 'specific_tool',
        description: 'A specific tool',
        parameters: {},
        requiresConfirmation: false,
        execute: async () => ({ success: true })
      }

      registry.registerTool(testTool)
      const retrieved = registry.getTool('specific_tool')

      expect(retrieved).toBe(testTool)
    })
  })

  describe('getGeminiToolDeclarations', () => {
    it('should return empty array when no tools registered', () => {
      const declarations = registry.getGeminiToolDeclarations()
      expect(declarations).toEqual([])
    })

    it('should convert tools to Gemini function declarations format', () => {
      const testTool: Tool = {
        name: 'read_file',
        description: 'Read a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'File path'
            }
          },
          required: ['path']
        },
        requiresConfirmation: false,
        execute: async () => ({ success: true })
      }

      registry.registerTool(testTool)
      const declarations = registry.getGeminiToolDeclarations()

      expect(declarations).toHaveLength(1)
      expect(declarations[0]).toEqual({
        name: 'read_file',
        description: 'Read a file',
        parameters: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: 'File path'
            }
          },
          required: ['path']
        }
      })
    })

    it('should convert multiple tools correctly', () => {
      const tool1: Tool = {
        name: 'tool1',
        description: 'First tool',
        parameters: { type: 'object', properties: {} },
        requiresConfirmation: false,
        execute: async () => ({ success: true })
      }

      const tool2: Tool = {
        name: 'tool2',
        description: 'Second tool',
        parameters: { type: 'object', properties: {} },
        requiresConfirmation: false,
        execute: async () => ({ success: true })
      }

      registry.registerTool(tool1)
      registry.registerTool(tool2)

      const declarations = registry.getGeminiToolDeclarations()
      expect(declarations).toHaveLength(2)
      expect(declarations.map(d => d.name)).toEqual(['tool1', 'tool2'])
    })
  })

  describe('executeTool', () => {
    it('should execute a tool successfully', async () => {
      const testTool: Tool = {
        name: 'echo_tool',
        description: 'Echo input',
        parameters: {},
        requiresConfirmation: false,
        execute: async (params) => ({
          success: true,
          data: `Echo: ${params.message}`
        })
      }

      registry.registerTool(testTool)
      const result = await registry.executeTool('echo_tool', { message: 'hello' }, mockSession)

      expect(result.success).toBe(true)
      expect(result.data).toBe('Echo: hello')
    })

    it('should throw error for non-existent tool', async () => {
      await expect(
        registry.executeTool('non_existent', {}, mockSession)
      ).rejects.toThrow('Tool not found: non_existent')
    })

    it('should pass session to tool execute function', async () => {
      let receivedUserId = 0

      const testTool: Tool = {
        name: 'session_tool',
        description: 'Uses session',
        parameters: {},
        requiresConfirmation: false,
        execute: async (params, session) => {
          receivedUserId = session.userId
          return { success: true }
        }
      }

      registry.registerTool(testTool)
      await registry.executeTool('session_tool', {}, mockSession)

      expect(receivedUserId).toBe(mockSession.userId)
    })

    it('should propagate tool execution errors', async () => {
      const testTool: Tool = {
        name: 'error_tool',
        description: 'Always fails',
        parameters: {},
        requiresConfirmation: false,
        execute: async () => {
          throw new Error('Tool execution failed')
        }
      }

      registry.registerTool(testTool)

      await expect(
        registry.executeTool('error_tool', {}, mockSession)
      ).rejects.toThrow('Tool execution failed')
    })
  })
})
