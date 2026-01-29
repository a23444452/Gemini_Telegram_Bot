import { createBot } from './bot/bot'
import { handlePwd, handleLs, handleCd } from './bot/handlers/directory'
import { config } from './config'
import { GeminiClient } from './gemini/client'
import { ToolRegistry } from './gemini/tools'
import { readFileTool, listDirectoryTool } from './tools/fileOperations'
import { sessionManager } from './bot/middleware/session'
import { permissionManager } from './permissions/permissionManager'

async function main() {
  console.log('🚀 Starting Gemini Telegram Bot...')

  const bot = createBot()

  // Set bot instance for permission manager
  permissionManager.setBot(bot)

  // Initialize tool registry
  const toolRegistry = new ToolRegistry()
  toolRegistry.registerTool(readFileTool)
  toolRegistry.registerTool(listDirectoryTool)

  // Initialize Gemini client with tools
  const geminiClient = new GeminiClient(
    config.gemini.apiKey,
    config.gemini.defaultModel,
    toolRegistry.getGeminiToolDeclarations()
  )

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

直接發送訊息即可與 Gemini 對話!
    `.trim()
    await ctx.reply(helpText)
  })

  bot.command('new', async (ctx) => {
    if (!ctx.from) return

    const userId = ctx.from.id
    sessionManager.updateSession(userId, { geminiContext: [] })
    await ctx.reply('🔄 已開始新對話')
  })

  // 工作目錄管理指令
  bot.command('pwd', handlePwd)
  bot.command('ls', handleLs)
  bot.command('cd', handleCd)

  // 處理權限確認的 callback query (確認按鈕點擊)
  bot.on('callback_query:data', async (ctx) => {
    const data = ctx.callbackQuery.data

    if (data.startsWith('approve:')) {
      const requestId = data.replace('approve:', '')
      permissionManager.handleCallback(requestId, true)
      await ctx.answerCallbackQuery({ text: '✅ 已允許' })
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } })
    } else if (data.startsWith('reject:')) {
      const requestId = data.replace('reject:', '')
      permissionManager.handleCallback(requestId, false)
      await ctx.answerCallbackQuery({ text: '❌ 已拒絕' })
      await ctx.editMessageReplyMarkup({ reply_markup: { inline_keyboard: [] } })
    }
  })

  // 處理一般文字訊息 - 發送給 Gemini
  bot.on('message:text', async (ctx) => {
    if (!ctx.from) return

    const userId = ctx.from.id
    const messageText = ctx.message.text

    // 忽略指令 (以 / 開頭)
    if (messageText.startsWith('/')) {
      return
    }

    try {
      // 發送給 Gemini (支援 function calling)
      const response = await geminiClient.sendMessage(userId, messageText, toolRegistry)
      await ctx.reply(response)
    } catch (error) {
      console.error('Error processing message:', error)
      await ctx.reply(`❌ 處理訊息時發生錯誤: ${error instanceof Error ? error.message : '未知錯誤'}`)
    }
  })

  // 啟動 bot
  await bot.start()
  console.log('✅ Bot is running!')
}

main().catch(console.error)
