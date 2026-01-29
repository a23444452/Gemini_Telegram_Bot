# 測試圖片生成功能

## 快速開始

### 前置條件

1. **環境變數**（已在 `.env` 中配置）：
   ```bash
   TELEGRAM_BOT_TOKEN=<your_token>
   GEMINI_API_KEY=<your_key>
   ```

2. **Google Cloud 認證**（用於 Nano Banana）：
   ```bash
   # 設定預設應用程式認證
   gcloud auth application-default login

   # 或設定認證檔案
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/credentials.json"
   ```

3. **安裝依賴**：
   ```bash
   npm install
   ```

### 執行 Bot

```bash
npm start
```

## 手動測試

### 測試案例 1：基本圖片生成

1. **傳送訊息到 bot**：
   ```
   請幫我生成一張可愛的小貓圖片
   ```

2. **預期行為**：
   - Bot 傳送確認要求，含有「核准」和「拒絕」按鈕
   - 工具名稱：`generate_image`
   - 顯示提示語參數

3. **點擊「核准」**

4. **預期結果**：
   - 訊息：「✅ 已允許」
   - 等待 10-30 秒
   - Bot 傳送：
     a. 來自 Gemini 的文字回應（例如，「我已經生成了一張可愛的小貓圖片！」）
     b. 生成的小貓圖片

### 測試案例 2：英文提示語

1. **傳送訊息**：
   ```
   Generate a futuristic city with flying cars at sunset
   ```

2. **點擊「核准」**

3. **預期結果**：
   - 文字回應
   - 高品質圖片符合描述

### 測試案例 3：拒絕權限

1. **傳送訊息**：
   ```
   Generate an image of a robot
   ```

2. **點擊「拒絕」**

3. **預期結果**：
   - 訊息：「❌ 已拒絕」
   - Gemini 回應權限遭拒
   - 未生成圖片

### 測試案例 4：複雜提示語

1. **傳送訊息**：
   ```
   Generate a serene Japanese garden with cherry blossoms, a stone bridge over a koi pond, and Mount Fuji in the background during golden hour
   ```

2. **點擊「核准」**

3. **預期結果**：
   - 詳細圖片符合提示語的所有元素

## 檢查日誌

監看主控台輸出以了解除錯資訊：

```bash
npm start

# 查找以下日誌訊息：
# [ImageGen] Generating image with prompt: <prompt>
# [ImageGen] MCP tool response received
# [ImageGen] Successfully generated image (<size> bytes base64)
```

## 故障排除

### 問題：「圖片生成服務不可用」

**解決方案**：
```bash
# 全域安裝 nanobanana
npm install -g nanobanana

# 測試是否可用
npx -y nanobanana
```

### 問題：「無法從回應中提取圖片資料」

**解決方案**：
- 檢查 Google Cloud 認證是否已配置
- 驗證 Imagen API 是否在您的 GCP 專案中啟用
- 檢查是否已啟用配額/計費

### 問題：MCP 用戶端連接錯誤

**解決方案**：
```bash
# 檢查 Node.js 版本（應為 18+）
node --version

# 重新安裝依賴
rm -rf node_modules
npm install
```

### 問題：圖片未在 Telegram 中顯示

**解決方案**：
- 檢查主控台中是否有「錯誤傳送圖片」訊息
- 驗證 base64 資料是否有效
- 確保圖片大小未超過 Telegram 限制（10MB）

## 預期輸出範例

### 主控台輸出（成功）

```
🚀 Starting Gemini Telegram Bot...
✅ Bot is running!
[ImageGen] Generating image with prompt: a cute cat
[ImageGen] MCP tool response received
[ImageGen] Successfully generated image (152837 bytes base64)
```

### 主控台輸出（錯誤）

```
[ImageGen] Error generating image: Error: Failed to connect to MCP server
Error sending message: Image generation service not available
```

## 效能指標

- **冷啟動**：約 5-10 秒（首次 nanobanana 下載）
- **暖啟動生成**：每張圖片約 15-25 秒
- **圖片大小**：通常 100-500 KB（base64：約 150-700 KB）

## 後續步驟

確認圖片生成可用後：

1. 測試各種提示語風格（逼真、卡通、抽象）
2. 測試錯誤處理（拒絕權限、無效提示語）
3. 測試多次連續生成
4. 監控 Google Cloud 使用量/配額

## 快速除錯指令

```bash
# 檢查 nanobanana 是否可存取
npx -y nanobanana --help

# 驗證 TypeScript 編譯
npx tsc --noEmit

# 檢查 bot token 是否有效
curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe

# 直接測試 MCP 用戶端（建立測試腳本）
node -e "console.log(require('./src/mcp/client'))"
```

## 已知限制

1. **每次提示一張圖片**：目前一次生成一張圖片
2. **無快取**：每個請求都生成新圖片
3. **無品質控制**：使用 Imagen 預設設定
4. **同步**：Bot 等待生成完成

## 成功標準

- ✅ 權限確認出現
- ✅ 使用者可以核准/拒絕
- ✅ 圖片在 30 秒內生成
- ✅ 圖片出現在 Telegram 聊天中
- ✅ Gemini 提供上下文相關回應
- ✅ 錯誤訊息對使用者友善
- ✅ 多次生成連續運行

---

**注意**：如果遇到 nanobanana 的持續問題，請查看：
- [Nano Banana GitHub Issues](https://github.com/gemini-cli-extensions/nanobanana/issues)
- [MCP SDK 文件](https://github.com/modelcontextprotocol/typescript-sdk)
