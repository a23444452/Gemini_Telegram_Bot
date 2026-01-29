import { config } from '../config'

/**
 * Usage statistics for a user
 */
interface UserUsage {
  requestCount: number
  tokenCount: number
  lastReset: Date
  hourlyRequests: number
  dailyTokens: number
}

/**
 * Quota manager for tracking API usage
 */
export class QuotaManager {
  private usage: Map<number, UserUsage> = new Map()

  /**
   * Initialize or get user usage stats
   */
  private getUsage(userId: number): UserUsage {
    if (!this.usage.has(userId)) {
      this.usage.set(userId, {
        requestCount: 0,
        tokenCount: 0,
        lastReset: new Date(),
        hourlyRequests: 0,
        dailyTokens: 0
      })
    }
    return this.usage.get(userId)!
  }

  /**
   * Reset counters if needed (hourly/daily)
   */
  private checkReset(usage: UserUsage): void {
    const now = new Date()
    const hoursSinceReset = (now.getTime() - usage.lastReset.getTime()) / (1000 * 60 * 60)

    // Reset hourly counter
    if (hoursSinceReset >= 1) {
      usage.hourlyRequests = 0
    }

    // Reset daily counter (24 hours)
    if (hoursSinceReset >= 24) {
      usage.dailyTokens = 0
      usage.lastReset = now
    }
  }

  /**
   * Increment request counter
   */
  incrementRequest(userId: number): void {
    const usage = this.getUsage(userId)
    this.checkReset(usage)

    usage.requestCount++
    usage.hourlyRequests++
  }

  /**
   * Increment token counter
   */
  incrementTokens(userId: number, count: number): void {
    const usage = this.getUsage(userId)
    this.checkReset(usage)

    usage.tokenCount += count
    usage.dailyTokens += count
  }

  /**
   * Check if user is within quota limits
   */
  checkQuota(userId: number): { allowed: boolean; reason?: string; warning?: boolean } {
    const usage = this.getUsage(userId)
    this.checkReset(usage)

    const limits = config.quotaLimits

    // Check hourly request limit
    if (usage.hourlyRequests >= limits.maxRequestsPerHour) {
      return {
        allowed: false,
        reason: `Hourly request limit exceeded (${limits.maxRequestsPerHour} requests/hour)`
      }
    }

    // Check daily token limit
    if (usage.dailyTokens >= limits.maxTokensPerDay) {
      return {
        allowed: false,
        reason: `Daily token limit exceeded (${limits.maxTokensPerDay} tokens/day)`
      }
    }

    // Check warning threshold
    const requestPercentage = (usage.hourlyRequests / limits.maxRequestsPerHour) * 100
    const tokenPercentage = (usage.dailyTokens / limits.maxTokensPerDay) * 100

    if (requestPercentage >= limits.warningThreshold || tokenPercentage >= limits.warningThreshold) {
      return {
        allowed: true,
        warning: true
      }
    }

    return { allowed: true }
  }

  /**
   * Get usage statistics for a user
   */
  getStatus(userId: number): {
    requests: {
      total: number
      hourly: number
      limit: number
      percentage: number
    }
    tokens: {
      total: number
      daily: number
      limit: number
      percentage: number
    }
    warningThreshold: number
    lastReset: Date
  } {
    const usage = this.getUsage(userId)
    this.checkReset(usage)

    const limits = config.quotaLimits

    return {
      requests: {
        total: usage.requestCount,
        hourly: usage.hourlyRequests,
        limit: limits.maxRequestsPerHour,
        percentage: (usage.hourlyRequests / limits.maxRequestsPerHour) * 100
      },
      tokens: {
        total: usage.tokenCount,
        daily: usage.dailyTokens,
        limit: limits.maxTokensPerDay,
        percentage: (usage.dailyTokens / limits.maxTokensPerDay) * 100
      },
      warningThreshold: limits.warningThreshold,
      lastReset: usage.lastReset
    }
  }

  /**
   * Format status as readable string
   */
  formatStatus(userId: number): string {
    const status = this.getStatus(userId)

    const requestBar = this.createProgressBar(status.requests.percentage)
    const tokenBar = this.createProgressBar(status.tokens.percentage)

    return `📊 **Usage Status**

**Requests (Hourly)**
${requestBar} ${status.requests.hourly}/${status.requests.limit} (${status.requests.percentage.toFixed(1)}%)
Total requests: ${status.requests.total}

**Tokens (Daily)**
${tokenBar} ${status.tokens.daily}/${status.tokens.limit} (${status.tokens.percentage.toFixed(1)}%)
Total tokens: ${status.tokens.total}

**Info**
⚠️ Warning threshold: ${status.warningThreshold}%
🕒 Last reset: ${status.lastReset.toLocaleString()}
⏰ Next hourly reset: ${this.getNextReset(status.lastReset, 1)}
📅 Next daily reset: ${this.getNextReset(status.lastReset, 24)}
`
  }

  /**
   * Create a progress bar
   */
  private createProgressBar(percentage: number): string {
    const filled = Math.round(percentage / 10)
    const empty = 10 - filled
    const bar = '█'.repeat(filled) + '░'.repeat(empty)

    if (percentage >= 90) return `🔴 ${bar}`
    if (percentage >= 70) return `🟡 ${bar}`
    return `🟢 ${bar}`
  }

  /**
   * Get next reset time
   */
  private getNextReset(lastReset: Date, hours: number): string {
    const nextReset = new Date(lastReset.getTime() + hours * 60 * 60 * 1000)
    const now = new Date()
    const diff = nextReset.getTime() - now.getTime()

    if (diff <= 0) return 'Now'

    const minutes = Math.floor(diff / (1000 * 60))
    const hoursLeft = Math.floor(minutes / 60)
    const minutesLeft = minutes % 60

    return `${hoursLeft}h ${minutesLeft}m`
  }

  /**
   * Reset usage for a specific user (admin function)
   */
  resetUser(userId: number): void {
    this.usage.delete(userId)
  }

  /**
   * Get all users' usage (admin function)
   */
  getAllUsage(): Map<number, UserUsage> {
    return new Map(this.usage)
  }
}

// Singleton instance
export const quotaManager = new QuotaManager()
