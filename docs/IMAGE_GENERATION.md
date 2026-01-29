# AI 圖片生成功能

## 概述

Gemini Telegram Bot 現已支援 AI 圖片生成功能，使用 Nano Banana MCP 伺服器連接到 Google 的 Gemini Imagen 模型。

## 架構

### 元件

1. **MCP 用戶端** (`src/mcp/client.ts`)
   - 透過 stdio 傳輸連接到 MCP 伺服器
   - 管理工具呼叫和回應
   - 處理連接生命週期

2. **圖片生成工具** (`src/tools/imageGeneration.ts`)
   - 使用 `executeMCPTool` helper 呼叫 nanobanana
   - 從 MCP 回應中提取 base64 圖片資料
   - 執行前需要使用者確認

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
權限管理器要求確認
  ↓
使用者同意
  ↓
MCP 用戶端連接到 nanobanana (npx -y nanobanana)
  ↓
nanobanana 呼叫 Gemini Imagen API
  ↓
返回 Base64 圖片
  ↓
GeminiClient 在回應中蒐集圖片
  ↓
Bot 將 base64 轉換為 Buffer
  ↓
Telegram 透過 InputFile 接收圖片
```

## 前置條件

### 1. 安裝 Nano Banana

Bot 使用 `npx -y nanobanana` 按需執行伺服器，初次使用時會自動下載。

或者，全域安裝：

```bash
npm install -g nanobanana
```

### 2. Google Cloud 配置

Nano Banana 需要具有 Imagen API 存取權的 Google Cloud 認證。設定如下：

```bash
export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
```

或設定預設應用程式認證：

```bash
gcloud auth application-default login
```

## 使用方式

### 功能測試

1. **啟動 bot**：
   ```bash
   npm start
   ```

2. **傳送訊息以生成圖片**：
   ```
   請幫我生成一張可愛的貓咪圖片
   ```
   或
   ```
   Generate a sunset over mountains with vibrant colors
   ```

3. **核准權限要求**：
   - Bot 會傳送確認訊息，含有「核准」和「拒絕」按鈕
   - 點擊「核准」以繼續

4. **等待圖片生成**：
   - Gemini Imagen 通常需要 10-30 秒
   - Bot 完成時會傳送生成的圖片

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
  description: 'Generate an image using AI based on a text prompt',
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
  requiresConfirmation: true  // Always requires user approval
}
```

### MCP 伺服器配置

- **伺服器指令**：`npx`
- **伺服器參數**：`['-y', 'nanobanana']`
- **工具名稱**：`generate_image`

## 錯誤處理

工具處理各種錯誤情況：

1. **服務不可用**：如果找不到或無法啟動 nanobanana
2. **API 錯誤**：如果 Gemini Imagen API 失敗
3. **逾時**：如果生成時間過長
4. **無效回應**：如果無法提取圖片資料
5. **Telegram 上傳錯誤**：如果無法傳送圖片

錯誤訊息用戶友善且會建議更正操作。

## 限制

1. **生成時間**：每張圖片 10-30 秒
2. **提示語長度**：最多 1000 個字元
3. **圖片大小**：受 Telegram 檔案大小限制（照片 10MB）
4. **速率限制**：受 Google Cloud API 配額限制
5. **需要確認**：始終需要使用者核准

## 安全性考量

1. **使用者確認**：所有圖片生成請求都需要明確的使用者核准
2. **提示語驗證**：對長度和內容進行基本驗證
3. **錯誤訊息**：不洩露內部系統詳細資訊
4. **資源限制**：限制提示語長度以防止濫用

## 故障排除

### 「圖片生成服務不可用」

- 確保已安裝 nanobanana：`npm install -g nanobanana`
- 檢查 Node.js/npm 是否正確配置
- 驗證網路連線

### 「無法提取圖片資料」

- 檢查 nanobanana 是否為最新版本
- 驗證 Google Cloud 認證已配置
- 檢查 MCP 伺服器日誌以了解詳細錯誤

### Telegram 中未顯示圖片

- 驗證圖片大小未超過 Telegram 限制
- 檢查 base64 編碼是否有效
- 確保 Buffer 轉換正常運行

## 開發

### 測試 MCP 用戶端

```typescript
import { MCPClient } from './src/mcp/client'

const client = new MCPClient()
await client.connect('npx', ['-y', 'nanobanana'])

const tools = await client.listTools()
console.log('Available tools:', tools)

const result = await client.callTool('generate_image', {
  prompt: 'A beautiful sunset'
})
console.log('Result:', result)

await client.disconnect()
```

### 添加新的 MCP 工具

1. 建立 MCP 用戶端實例
2. 連接到伺服器
3. 使用參數呼叫工具
4. 提取並處理結果
5. 中斷連接

請參閱 `src/mcp/client.ts` 以了解 helper 函式。

## 未來改進

- [ ] 支援多個圖片生成後端（DALL-E、Stable Diffusion）
- [ ] 圖片編輯功能
- [ ] 風格預設（卡通、逼真、藝術）
- [ ] 批次圖片生成
- [ ] 圖片轉圖片轉換
- [ ] 負面提示語支援
- [ ] 解析度/品質控制

## 參考資料

- [MCP SDK 文件](https://github.com/modelcontextprotocol/typescript-sdk)
- [Nano Banana GitHub](https://github.com/gemini-cli-extensions/nanobanana)
- [Grammy 檔案處理](https://grammy.dev/guide/files)
- [Google Gemini Imagen API](https://cloud.google.com/vertex-ai/docs/generative-ai/image/overview)
