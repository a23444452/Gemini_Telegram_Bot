import type { Bot } from 'grammy'

/**
 * Manages permission requests for tool execution
 * Implements singleton pattern to share state across the application
 */
export class PermissionManager {
  private static instance: PermissionManager
  private bot?: Bot
  private pendingRequests: Map<string, (approved: boolean) => void> = new Map()

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): PermissionManager {
    if (!PermissionManager.instance) {
      PermissionManager.instance = new PermissionManager()
    }
    return PermissionManager.instance
  }

  /**
   * Set bot instance for sending confirmation messages
   */
  setBot(bot: Bot): void {
    this.bot = bot
  }

  /**
   * Request confirmation from user for tool execution
   * @param toolName - Name of the tool to execute
   * @param params - Parameters for the tool
   * @param userId - Telegram user ID
   * @returns Promise that resolves to true if approved, false otherwise
   */
  async requestConfirmation(
    toolName: string,
    params: Record<string, any>,
    userId: number
  ): Promise<boolean> {
    if (!this.bot) {
      throw new Error('Bot not set in PermissionManager')
    }

    // Generate unique request ID
    const requestId = `${userId}-${toolName}-${Date.now()}`

    // Format params for display
    const paramsStr = JSON.stringify(params, null, 2)
    const message = `
⚠️ 工具執行確認

工具: ${toolName}
參數:
\`\`\`json
${paramsStr}
\`\`\`

是否允許執行此操作?
    `.trim()

    // Create confirmation buttons
    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ 允許', callback_data: `approve:${requestId}` },
          { text: '❌ 拒絕', callback_data: `reject:${requestId}` }
        ]
      ]
    }

    // Send confirmation message
    await this.bot.api.sendMessage(userId, message, {
      reply_markup: keyboard,
      parse_mode: 'Markdown'
    })

    // Wait for user response
    return new Promise((resolve) => {
      this.pendingRequests.set(requestId, resolve)

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          this.pendingRequests.delete(requestId)
          resolve(false) // Timeout = reject
        }
      }, 30000)
    })
  }

  /**
   * Handle callback from user (approve/reject button click)
   * @param requestId - Unique request ID
   * @param approved - Whether user approved the request
   */
  handleCallback(requestId: string, approved: boolean): void {
    const resolver = this.pendingRequests.get(requestId)
    if (resolver) {
      resolver(approved)
      this.pendingRequests.delete(requestId)
    }
  }
}

/**
 * Singleton instance
 */
export const permissionManager = PermissionManager.getInstance()
