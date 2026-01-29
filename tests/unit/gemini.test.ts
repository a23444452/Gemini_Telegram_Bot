import { describe, it, expect, beforeEach, mock } from 'bun:test'
import { GeminiClient } from '../../src/gemini/client'
import { sessionManager } from '../../src/bot/middleware/session'

// Mock GoogleGenerativeAI
const mockSendMessage = mock(async () => ({
  response: {
    text: () => 'Mock response from Gemini',
    functionCalls: () => []
  }
}))

const mockGetHistory = mock(async () => [
  { role: 'user', parts: [{ text: 'test' }] },
  { role: 'model', parts: [{ text: 'response' }] }
])

const mockStartChat = mock(() => ({
  sendMessage: mockSendMessage,
  getHistory: mockGetHistory
}))

const mockGetGenerativeModel = mock((_config?: any) => ({
  startChat: mockStartChat
}))

mock.module('@google/generative-ai', () => ({
  GoogleGenerativeAI: class {
    constructor(_apiKey?: string) {}
    getGenerativeModel(config: any) {
      mockGetGenerativeModel(config)
      return {
        startChat: mockStartChat
      }
    }
  }
}))

describe('GeminiClient', () => {
  let client: GeminiClient
  const testUserId = 888888

  beforeEach(() => {
    // Reset mocks
    mockSendMessage.mockClear()
    mockStartChat.mockClear()
    mockGetGenerativeModel.mockClear()
    mockGetHistory.mockClear()

    // Create fresh session
    sessionManager.updateSession(testUserId, {
      geminiContext: []
    })

    // Create client
    client = new GeminiClient('test-api-key', 'gemini-2.0-flash-exp')
  })

  describe('constructor', () => {
    it('should initialize with API key and model name', () => {
      expect(client).toBeDefined()
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'gemini-2.0-flash-exp',
        tools: undefined
      })
    })
  })

  describe('sendMessage', () => {
    it('should send a message and return response', async () => {
      mockSendMessage.mockResolvedValueOnce({
        response: {
          text: () => 'Hello from Gemini!',
          functionCalls: () => []
        }
      } as any)

      const response = await client.sendMessage(testUserId, 'Hello')

      expect(response).toBe('Hello from Gemini!')
      expect(mockStartChat).toHaveBeenCalled()
      expect(mockSendMessage).toHaveBeenCalledWith('Hello')
    })

    it('should maintain conversation history in session', async () => {
      mockSendMessage.mockResolvedValueOnce({
        response: {
          text: () => 'Response 1',
          functionCalls: () => []
        }
      } as any)

      mockGetHistory.mockResolvedValueOnce([
        { role: 'user', parts: [{ text: 'Message 1' }] },
        { role: 'model', parts: [{ text: 'Response 1' }] }
      ])

      await client.sendMessage(testUserId, 'Message 1')

      const session = sessionManager.getSession(testUserId)
      expect(session.geminiContext).toHaveLength(2)
      expect(session.geminiContext[0]).toEqual({
        role: 'user',
        parts: [{ text: 'Message 1' }]
      })
      expect(session.geminiContext[1]).toEqual({
        role: 'model',
        parts: [{ text: 'Response 1' }]
      })
    })

    it('should use existing conversation history', async () => {
      // Set up existing context
      sessionManager.updateSession(testUserId, {
        geminiContext: [
          { role: 'user', parts: [{ text: 'Previous message' }] },
          { role: 'model', parts: [{ text: 'Previous response' }] }
        ]
      })

      mockSendMessage.mockResolvedValueOnce({
        response: {
          text: () => 'New response',
          functionCalls: () => []
        }
      } as any)

      await client.sendMessage(testUserId, 'New message')

      // Check that startChat was called with history
      expect(mockStartChat).toHaveBeenCalledWith({
        history: [
          { role: 'user', parts: [{ text: 'Previous message' }] },
          { role: 'model', parts: [{ text: 'Previous response' }] }
        ]
      })
    })

    it('should handle errors gracefully', async () => {
      mockSendMessage.mockRejectedValueOnce(new Error('API Error'))

      await expect(
        client.sendMessage(testUserId, 'Test')
      ).rejects.toThrow('API Error')
    })
  })
})
