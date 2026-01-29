import type { Context, NextFunction } from 'grammy'
import { config } from '../../config'

export async function authMiddleware(ctx: Context, next: NextFunction) {
  const userId = ctx.from?.id

  if (!userId) {
    await ctx.reply('❌ 無法識別使用者')
    return
  }

  if (!config.telegram.allowedUsers.includes(userId)) {
    await ctx.reply(`❌ 未授權的使用者\n\n你的 User ID: ${userId}\n\n請聯絡管理員新增此 ID 到 TELEGRAM_ALLOWED_USERS`)
    return
  }

  await next()
}
