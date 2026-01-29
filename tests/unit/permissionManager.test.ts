import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { PermissionManager } from '../../src/permissions/permissionManager'
import type { Bot, Api } from 'grammy'

describe('PermissionManager', () => {
  let permissionManager: PermissionManager
  let mockBot: Partial<Bot>
  let mockApi: Partial<Api>

  beforeEach(() => {
    // Reset singleton instance
    PermissionManager['instance'] = undefined as any

    // Create mock bot with api
    mockApi = {
      sendMessage: vi.fn().mockResolvedValue({ message_id: 123 })
    }

    mockBot = {
      api: mockApi as Api
    }

    permissionManager = PermissionManager.getInstance()
    permissionManager.setBot(mockBot as Bot)
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = PermissionManager.getInstance()
      const instance2 = PermissionManager.getInstance()

      expect(instance1).toBe(instance2)
    })
  })

  describe('setBot', () => {
    it('should set bot instance', () => {
      const newPermissionManager = PermissionManager.getInstance()
      expect(() => newPermissionManager.setBot(mockBot as Bot)).not.toThrow()
    })
  })

  describe('requestConfirmation', () => {
    it('should send confirmation message with inline keyboard', async () => {
      const toolName = 'test_tool'
      const params = { file: 'test.txt', action: 'delete' }
      const userId = 12345

      // Start request in background
      const confirmationPromise = permissionManager.requestConfirmation(
        toolName,
        params,
        userId
      )

      // Wait a bit for message to be sent
      await new Promise(resolve => setTimeout(resolve, 10))

      // Verify sendMessage was called
      expect(mockApi.sendMessage).toHaveBeenCalledWith(
        userId,
        expect.stringContaining('工具執行確認'),
        expect.objectContaining({
          reply_markup: expect.objectContaining({
            inline_keyboard: expect.arrayContaining([
              expect.arrayContaining([
                expect.objectContaining({ text: '✅ 允許' }),
                expect.objectContaining({ text: '❌ 拒絕' })
              ])
            ])
          }),
          parse_mode: 'Markdown'
        })
      )

      // Simulate user approval
      const callArgs = (mockApi.sendMessage as any).mock.calls[0]
      const keyboard = callArgs[2].reply_markup
      const approveButton = keyboard.inline_keyboard[0][0]
      const requestId = approveButton.callback_data.replace('approve:', '')

      permissionManager.handleCallback(requestId, true)

      const approved = await confirmationPromise
      expect(approved).toBe(true)
    })

    it('should return true when user approves', async () => {
      const toolName = 'test_tool'
      const params = { file: 'test.txt' }
      const userId = 12345

      const confirmationPromise = permissionManager.requestConfirmation(
        toolName,
        params,
        userId
      )

      // Wait for message to be sent
      await new Promise(resolve => setTimeout(resolve, 10))

      // Get requestId from the callback_data
      const callArgs = (mockApi.sendMessage as any).mock.calls[0]
      const keyboard = callArgs[2].reply_markup
      const approveButton = keyboard.inline_keyboard[0][0]
      const requestId = approveButton.callback_data.replace('approve:', '')

      // Simulate user approval
      permissionManager.handleCallback(requestId, true)

      const approved = await confirmationPromise
      expect(approved).toBe(true)
    })

    it('should return false when user rejects', async () => {
      const toolName = 'test_tool'
      const params = { file: 'test.txt' }
      const userId = 12345

      const confirmationPromise = permissionManager.requestConfirmation(
        toolName,
        params,
        userId
      )

      // Wait for message to be sent
      await new Promise(resolve => setTimeout(resolve, 10))

      // Get requestId from the callback_data
      const callArgs = (mockApi.sendMessage as any).mock.calls[0]
      const keyboard = callArgs[2].reply_markup
      const rejectButton = keyboard.inline_keyboard[0][1]
      const requestId = rejectButton.callback_data.replace('reject:', '')

      // Simulate user rejection
      permissionManager.handleCallback(requestId, false)

      const approved = await confirmationPromise
      expect(approved).toBe(false)
    })

    it('should timeout and return false after 30 seconds', async () => {
      vi.useFakeTimers()

      const toolName = 'test_tool'
      const params = { file: 'test.txt' }
      const userId = 12345

      const confirmationPromise = permissionManager.requestConfirmation(
        toolName,
        params,
        userId
      )

      // Fast-forward time by 30 seconds
      await vi.advanceTimersByTimeAsync(30000)

      const approved = await confirmationPromise
      expect(approved).toBe(false)

      vi.useRealTimers()
    })

    it('should throw error if bot is not set', async () => {
      const newManager = PermissionManager.getInstance()
      PermissionManager['instance'] = new PermissionManager()
      const managerWithoutBot = PermissionManager['instance']

      await expect(
        managerWithoutBot.requestConfirmation('test', {}, 123)
      ).rejects.toThrow('Bot not set in PermissionManager')
    })
  })

  describe('handleCallback', () => {
    it('should do nothing if requestId does not exist', () => {
      expect(() => {
        permissionManager.handleCallback('non-existent-id', true)
      }).not.toThrow()
    })
  })
})
