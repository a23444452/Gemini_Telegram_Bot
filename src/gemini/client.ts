import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import { sessionManager } from '../bot/middleware/session'
import type { GeminiMessage } from '../types/session'
import type { ToolRegistry } from './tools'

/**
 * Client for interacting with Google Gemini API
 */
export class GeminiClient {
  private genAI: GoogleGenerativeAI
  private model: GenerativeModel

  constructor(apiKey: string, modelName: string, tools?: any[]) {
    this.genAI = new GoogleGenerativeAI(apiKey)
    this.model = this.genAI.getGenerativeModel({
      model: modelName,
      tools: tools && tools.length > 0 ? tools : undefined
    })
  }

  /**
   * Send a message to Gemini and maintain conversation history
   * @param userId - Telegram user ID
   * @param message - User message text
   * @param toolRegistry - Optional tool registry for function calling
   * @returns Gemini's response text
   */
  async sendMessage(userId: number, message: string, toolRegistry?: ToolRegistry): Promise<string> {
    // Get current session and conversation history
    const session = sessionManager.getSession(userId)
    const history = session.geminiContext

    // Create chat session with history
    const chat = this.model.startChat({
      history: history.length > 0 ? history : undefined
    })

    // Send message
    let result = await chat.sendMessage(message)

    // Handle function calling loop
    while (result.response.functionCalls && result.response.functionCalls().length > 0) {
      const functionCalls = result.response.functionCalls()

      // Execute all function calls
      const functionResponses = await Promise.all(
        functionCalls.map(async (fc: any) => {
          if (!toolRegistry) {
            return {
              name: fc.name,
              response: { error: 'Tool registry not available' }
            }
          }

          const toolResult = await toolRegistry.executeTool(fc.name, fc.args, session)
          return {
            name: fc.name,
            response: toolResult
          }
        })
      )

      // Send function results back to Gemini
      result = await chat.sendMessage(functionResponses as any)
    }

    const responseText = result.response.text()

    // Update conversation history with complete chat history
    const updatedHistory = await chat.getHistory()
    sessionManager.updateSession(userId, {
      geminiContext: updatedHistory as GeminiMessage[]
    })

    return responseText
  }
}
