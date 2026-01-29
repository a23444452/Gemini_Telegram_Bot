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
    console.log(`🔐 Creating permission request - requestId: ${requestId}`)

    // Format params for display
    const paramsStr = JSON.stringify(params, null, 2)
    const message = `⚠️ 工具執行確認

工具: ${toolName}
參數:
${paramsStr}

是否允許執行此操作?`

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
      reply_markup: keyboard
    })

    // Wait for user response
    return new Promise((resolve) => {
      console.log(`⏳ Setting up Promise for requestId: ${requestId}`)
      this.pendingRequests.set(requestId, resolve)
      console.log(`📋 Pending requests after set:`, Array.from(this.pendingRequests.keys()))

      // Timeout after 120 seconds (2 minutes)
      setTimeout(() => {
        if (this.pendingRequests.has(requestId)) {
          console.log(`⏱️ Timeout reached for requestId: ${requestId}`)
          this.pendingRequests.delete(requestId)
          resolve(false) // Timeout = reject
        }
      }, 120000)
    })
  }

  /**
   * Handle callback from user (approve/reject button click)
   * @param requestId - Unique request ID
   * @param approved - Whether user approved the request
   * @returns true if resolver was found and executed, false if request expired
   */
  handleCallback(requestId: string, approved: boolean): boolean {
    console.log(`🔔 PermissionManager.handleCallback called - requestId: ${requestId}, approved: ${approved}`)
    console.log(`📋 Pending requests:`, Array.from(this.pendingRequests.keys()))

    const resolver = this.pendingRequests.get(requestId)
    if (resolver) {
      console.log(`✅ Resolver found! Resolving with: ${approved}`)
      resolver(approved)
      this.pendingRequests.delete(requestId)
      console.log(`🗑️ Request ${requestId} deleted from pending`)
      return true
    } else {
      console.log(`❌ No resolver found for requestId: ${requestId}`)
      return false
    }
  }
}

/**
 * Singleton instance
 */
export const permissionManager = PermissionManager.getInstance()
