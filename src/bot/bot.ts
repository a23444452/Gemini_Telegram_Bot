import { Bot } from 'grammy'
import { config } from '../config'
import { authMiddleware } from './middleware/auth'

export function createBot() {
  const bot = new Bot(config.telegram.botToken)

  // 全域認證中介軟體
  bot.use(authMiddleware)

  // 錯誤處理
  bot.catch((err) => {
    console.error('Bot error:', err)
  })

  return bot
}
