import { createBot } from './bot/bot'

async function main() {
  console.log('🚀 Starting Gemini Telegram Bot...')

  const bot = createBot()

  // 基本指令
  bot.command('start', async (ctx) => {
    await ctx.reply('👋 歡迎使用 Gemini Telegram Bot!\n\n使用 /help 查看可用指令')
  })

  bot.command('help', async (ctx) => {
    const helpText = `
📚 可用指令:

**基本指令**
/start - 開始使用
/help - 顯示此幫助訊息
/new - 開始新對話

**工作目錄**
/pwd - 顯示當前目錄
/ls [path] - 列出目錄內容
/cd <path> - 切換目錄

**進階功能**
/status - 查看狀態
/model <pro|flash> - 切換模型
    `.trim()
    await ctx.reply(helpText)
  })

  // 啟動 bot
  await bot.start()
  console.log('✅ Bot is running!')
}

main().catch(console.error)
