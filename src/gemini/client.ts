import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'
import { sessionManager } from '../bot/middleware/session'
import type { GeminiMessage } from '../types/session'
import type { ToolRegistry } from './tools'
import { permissionManager } from '../permissions/permissionManager'

export interface GeminiResponse {
  text: string
  images?: string[] // Base64 encoded images
}

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
   * @returns Gemini's response (text and optional images)
   */
  async sendMessage(userId: number, message: string, toolRegistry?: ToolRegistry): Promise<GeminiResponse> {
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
    let functionCalls = result.response.functionCalls?.()
    const collectedImages: string[] = []

    while (functionCalls && functionCalls.length > 0) {

      // Execute all function calls with permission checks
      const functionResponses = await Promise.all(
        functionCalls.map(async (fc: any) => {
          if (!toolRegistry) {
            return {
              name: fc.name,
              response: { error: 'Tool registry not available' }
            }
          }

          const tool = toolRegistry.getTool(fc.name)
          if (!tool) {
            return {
              name: fc.name,
              response: { error: `Tool not found: ${fc.name}` }
            }
          }

          // Check if permission confirmation is required
          if (tool.requiresConfirmation) {
            const approved = await permissionManager.requestConfirmation(
              fc.name,
              fc.args,
              userId
            )

            if (!approved) {
              return {
                name: fc.name,
                response: {
                  success: false,
                  error: 'User denied permission to execute this tool'
                }
              }
            }
          }

          // Execute tool
          const toolResult = await toolRegistry.executeTool(fc.name, fc.args, session)

          // Collect images from tool results
          if (toolResult.success && toolResult.data?.image) {
            collectedImages.push(toolResult.data.image)
          }

          return {
            name: fc.name,
            response: toolResult
          }
        })
      )

      // Send function results back to Gemini
      result = await chat.sendMessage(functionResponses as any)
      functionCalls = result.response.functionCalls?.()
    }

    const responseText = result.response.text()

    // Update conversation history with complete chat history
    const updatedHistory = await chat.getHistory()
    sessionManager.updateSession(userId, {
      geminiContext: updatedHistory as GeminiMessage[]
    })

    return {
      text: responseText,
      images: collectedImages.length > 0 ? collectedImages : undefined
    }
  }
}
