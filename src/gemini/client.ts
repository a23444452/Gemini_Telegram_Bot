import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import { sessionManager } from '../bot/middleware/session'
import type { GeminiMessage } from '../types/session'

/**
 * Client for interacting with Google Gemini API
 */
export class GeminiClient {
  private genAI: GoogleGenerativeAI
  private model: GenerativeModel

  constructor(apiKey: string, modelName: string) {
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      tools: [] // Will be populated with ToolRegistry later
    })
  }

  /**
   * Send a message to Gemini and maintain conversation history
   * @param userId - Telegram user ID
   * @param message - User message text
   * @returns Gemini's response text
   */
  async sendMessage(userId: number, message: string): Promise<string> {
    // Get current session and conversation history
    const session = sessionManager.getSession(userId)
    const history = session.geminiContext

    // Create chat session with history
    const chat = this.model.startChat({
      history: history.length > 0 ? history : undefined
    })

    // Send message
    const result = await chat.sendMessage(message)
    const responseText = result.response.text()

    // Update conversation history
    const newContext: GeminiMessage[] = [
      ...history,
      { role: 'user', parts: [{ text: message }] },
      { role: 'model', parts: [{ text: responseText }] }
    ]

    sessionManager.updateSession(userId, {
      geminiContext: newContext
    })

    return responseText
  }
}
