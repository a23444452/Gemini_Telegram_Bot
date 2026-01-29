# AI 圖片生成功能

## 概述

Gemini Telegram Bot 支援 AI 圖片生成功能，使用 mcp-image MCP 伺服器連接到 Google 的 Gemini 2.5 Flash Image API，可生成 2K 解析度 (2048x2048) 的正方形圖片。

## 架構

### 元件

1. **MCP 用戶端** (`src/mcp/client.ts`)
   - 透過 stdio 傳輸連接到 MCP 伺服器
   - 支援傳遞環境變數（如 GEMINI_API_KEY）
   - 管理工具呼叫和回應
   - 處理連接生命週期

2. **圖片生成工具** (`src/tools/imageGeneration.ts`)
   - 使用 `executeMCPTool` helper 呼叫 mcp-image
   - 從檔案 URI 讀取生成的圖片
   - 將圖片轉換為 base64 格式
   - 自動執行，無需使用者確認（避免逾時問題）

3. **Bot 整合** (`src/index.ts`)
   - 註冊圖片生成工具
   - 處理來自 Gemini 的圖片回應
   - 使用 InputFile 將圖片傳送到 Telegram

### 流程

```
使用者：「幫我生成一張可愛的貓咪圖片」
  ↓
Gemini 決定呼叫 generate_image 工具
  ↓
自動執行（無需確認）
  ↓
MCP 用戶端連接到 mcp-image (npx -y mcp-image)
  ↓
mcp-image 呼叫 Gemini 2.5 Flash Image API
  ↓
圖片儲存至本地檔案，返回 file:// URI
  ↓
工具讀取檔案並轉換為 Base64
  ↓
GeminiClient 在回應中蒐集圖片
  ↓
Bot 將 base64 轉換為 Buffer
  ↓
Telegram 透過 InputFile 接收圖片
```

## 前置條件

### 1. Google Gemini API Key

圖片生成使用與對話相同的 `GOOGLE_API_KEY`，無需額外設定。

在 `.env` 中設定：

```bash
GOOGLE_API_KEY=AIzaSyD...your-api-key-here
```

### 2. mcp-image 套件

Bot 使用 `npx -y mcp-image` 按需執行伺服器，初次使用時會自動下載。

或者，全域安裝：

```bash
npm install -g mcp-image
```

## 使用方式

### 功能測試

1. **啟動 bot**：
   ```bash
   ./start.sh
   # 或
   bun run src/index.ts
   ```

2. **傳送訊息以生成圖片**：
   ```
   請幫我生成一張可愛的貓咪圖片
   ```
   或
   ```
   Generate a sunset over mountains with vibrant colors
   ```

3. **等待圖片生成**：
   - Gemini 2.5 Flash Image 通常需要 10-30 秒
   - Bot 完成時會傳送生成的 2K 解析度圖片

### 範例提示語

- "Generate a futuristic city with flying cars"
- "Create an image of a peaceful forest with sunlight"
- "Draw a cartoon style robot playing guitar"
- "請生成一張櫻花盛開的日本庭園"

## 配置

### 工具定義

```typescript
{
  name: 'generate_image',
  description: 'Generate a 2K resolution (2048x2048) square image using AI based on a text prompt',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Detailed description of the image to generate'
      }
    },
    required: ['prompt']
  },
  requiresConfirmation: false  // 自動執行，避免逾時問題
}
```

### MCP 伺服器配置

- **伺服器指令**：`npx`
- **伺服器參數**：`['-y', 'mcp-image']`
- **工具名稱**：`generate_image`
- **環境變數**：`GEMINI_API_KEY`
- **圖片格式**：1:1 正方形 (2048x2048)

## 錯誤處理

工具處理各種錯誤情況：

1. **API Key 未設定**：如果 GOOGLE_API_KEY 未配置
2. **服務不可用**：如果找不到或無法啟動 mcp-image
3. **API 錯誤**：如果 Gemini Image API 失敗
4. **逾時**：如果生成時間過長
5. **無效回應**：如果無法提取圖片資料
6. **Telegram 上傳錯誤**：如果無法傳送圖片

錯誤訊息用戶友善且會建議更正操作。

## 限制

1. **生成時間**：每張圖片 10-30 秒
2. **提示語長度**：最多 1000 個字元
3. **圖片解析度**：固定為 2K (2048x2048) 正方形
4. **圖片大小**：受 Telegram 檔案大小限制（照片 10MB）
5. **速率限制**：受 Google AI Studio API 配額限制

## 安全性考量

1. **自動執行**：圖片生成自動執行以避免逾時問題
2. **提示語驗證**：對長度和內容進行基本驗證
3. **錯誤訊息**：不洩露內部系統詳細資訊
4. **資源限制**：限制提示語長度以防止濫用

## 故障排除

### 「GOOGLE_API_KEY not configured」

- 確認 `.env` 中已設定 `GOOGLE_API_KEY`
- 重新啟動機器人以載入新設定

### 「圖片生成服務不可用」

- 確保已安裝 mcp-image：`npm install -g mcp-image`
- 檢查 Node.js/npm 是否正確配置
- 驗證網路連線

### 「無法提取圖片資料」

- 檢查 mcp-image 是否為最新版本
- 驗證 GOOGLE_API_KEY 是否有效
- 檢查機器人日誌以了解詳細錯誤：
  ```bash
  cat bot.log | grep ImageGen
  ```

### Telegram 中未顯示圖片

- 驗證圖片大小未超過 Telegram 限制
- 檢查 base64 編碼是否有效
- 確保 Buffer 轉換正常運行

## 開發

### 測試 MCP 用戶端

```typescript
import { executeMCPTool } from './src/mcp/client'

const result = await executeMCPTool(
  'npx',
  ['-y', 'mcp-image'],
  'generate_image',
  {
    prompt: 'A beautiful sunset',
    aspectRatio: '1:1'
  },
  {
    GEMINI_API_KEY: process.env.GOOGLE_API_KEY
  }
)
console.log('Result:', result)
```

### 添加新的 MCP 工具

1. 建立 MCP 用戶端實例
2. 連接到伺服器（可傳遞環境變數）
3. 使用參數呼叫工具
4. 提取並處理結果
5. 中斷連接

請參閱 `src/mcp/client.ts` 以了解 helper 函式。

## 參考資料

- [MCP SDK 文件](https://github.com/modelcontextprotocol/typescript-sdk)
- [mcp-image GitHub](https://github.com/anthropics/mcp-image)
- [Grammy 檔案處理](https://grammy.dev/guide/files)
- [Google AI Studio](https://aistudio.google.com/)
