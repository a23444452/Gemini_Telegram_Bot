# Gemini Telegram Bot

一個強大的 Telegram 機器人,由 Google Gemini AI 驅動,支援檔案操作、AI 圖片生成、網頁瀏覽自動化,以及具備函式呼叫能力的智慧對話。

## 功能特色

- **Gemini AI 對話** - 使用 Gemini 3 Pro Preview 進行智慧對話
- **函式呼叫** - 自動調用工具完成任務
- **檔案操作** - 讀取、寫入、移動、複製和刪除檔案
- **AI 圖片生成** - 使用 Gemini 2.5 Flash Image API (mcp-image) 生成 2K 解析度圖片
- **網頁瀏覽自動化** - 使用 Playwright 瀏覽網站、擷取截圖和提取資料
- **權限控制** - 所有操作需要使用者確認
- **對話歷史** - 維護多輪對話上下文
- **工作目錄管理** - 安全的目錄導航和瀏覽
- **配額管理** - 追蹤 token 使用量和請求限制

## 環境需求

- [Bun](https://bun.sh/) >= 1.0 (或 Node.js >= 18)
- Telegram Bot Token
- Google Gemini API Key (用於對話和圖片生成)
- Playwright 瀏覽器 (隨依賴項自動安裝)

## 安裝步驟

### 1. 複製專案

```bash
git clone <repository-url>
cd gemini-telegram-bot
```

### 2. 安裝依賴項

```bash
bun install
# 或使用 npm
npm install
```

### 3. 安裝 Playwright 瀏覽器

```bash
# 安裝 Chromium 瀏覽器
npx playwright install chromium

# 或安裝所有瀏覽器
npx playwright install
```

### 4. 設定環境變數

```bash
cp .env.example .env
# 編輯 .env 檔案填入您的設定
```

### 5. 設定 Telegram Bot Token

1. 在 Telegram 上與 [@BotFather](https://t.me/BotFather) 對話以建立機器人
2. 複製 bot token 到 `.env` 的 `TELEGRAM_BOT_TOKEN`
3. 與 [@userinfobot](https://t.me/userinfobot) 對話取得您的 User ID
4. 將您的 User ID 加入 `.env` 的 `TELEGRAM_ALLOWED_USERS`

範例:
```bash
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_ALLOWED_USERS=123456789,987654321
```

### 6. 設定 Google Gemini API

1. 前往 [Google AI Studio](https://aistudio.google.com/)
2. 建立 API Key
3. 複製到 `.env` 的 `GOOGLE_API_KEY`

```bash
GOOGLE_API_KEY=AIzaSyD...your-api-key-here
```

### 7. 圖片生成功能

圖片生成使用與對話相同的 `GOOGLE_API_KEY`,無需額外設定。

功能特點:
- 使用 Gemini 2.5 Flash Image API (mcp-image MCP 伺服器)
- 自動生成 2K 解析度 (2048x2048) 正方形圖片
- 自動執行,無需確認即可快速生成

## 啟動與停止

### 啟動機器人

```bash
./start.sh
```

此指令會:
- 檢查環境變數和依賴項
- 在背景模式啟動機器人
- 建立 PID 檔案以便管理程序
- 將輸出記錄到 `bot.log`

### 停止機器人

```bash
./stop.sh
```

### 檢查狀態

```bash
./status.sh
```

顯示內容:
- 執行狀態
- 程序 ID (PID)
- 執行時間和啟動時間
- 記憶體和 CPU 使用率
- 最近的日誌項目

### 查看日誌

```bash
# 查看所有日誌
cat bot.log

# 即時追蹤日誌
tail -f bot.log

# 查看最後 50 行
tail -50 bot.log
```

## 使用方式

### 基本指令

- `/start` - 開始使用機器人
- `/help` - 顯示幫助訊息
- `/new` - 開始新對話
- `/pwd` - 顯示當前工作目錄
- `/ls [path]` - 列出目錄內容
- `/cd <path>` - 切換目錄

### 對話範例

直接傳送訊息給機器人:

```
使用者: 請列出當前目錄的檔案
機器人: [呼叫 list_directory 工具]
機器人: 當前目錄包含: ...

使用者: 請建立一個 test.txt 檔案,內容為「Hello World」
機器人: [請求確認]
使用者: [點擊允許]
機器人: [呼叫 write_file 工具]
機器人: 檔案建立成功

使用者: 請生成一張可愛的小貓圖片
機器人: [自動呼叫 generate_image 工具]
機器人: [傳送 2K 解析度的生成圖片]

使用者: 請瀏覽 https://example.com 並總結內容
機器人: [呼叫 browse_url 工具]
機器人: 該網站包含...

使用者: 擷取 https://google.com 的截圖
機器人: [呼叫 screenshot_url 工具]
機器人: [傳送截圖]
```

### 可用工具

#### 讀取操作 (自動執行)

- `read_file` - 讀取檔案內容
- `list_directory` - 列出目錄內容

#### 寫入操作 (需要確認)

- `write_file` - 寫入檔案
- `append_file` - 附加內容到檔案
- `delete_file` - 刪除檔案
- `create_directory` - 建立目錄
- `move_file` - 移動或重新命名檔案
- `copy_file` - 複製檔案

#### 瀏覽器操作 (自動執行)

- `browse_url` - 導航到 URL 並提取內容 (標題和文字)
- `screenshot_url` - 擷取網頁截圖 (回傳 base64 PNG)
- `extract_data` - 使用 CSS 選擇器從網頁提取特定資料

#### AI 操作 (自動執行)

- `generate_image` - 使用 Gemini 2.5 Flash Image API 生成 2K 解析度 AI 圖片

## 專案結構

```
gemini-telegram-bot/
├── src/
│   ├── bot/              # Telegram bot 邏輯
│   │   ├── bot.ts        # 主要 bot 實例
│   │   └── handlers.ts   # 指令和訊息處理器
│   ├── gemini/           # Gemini AI 整合
│   │   ├── client.ts     # Gemini 客戶端
│   │   ├── function-calling.ts  # 函式呼叫邏輯
│   │   └── conversation.ts      # 對話管理
│   ├── tools/            # 工具實作
│   │   ├── fileOperations.ts    # 檔案操作工具
│   │   ├── imageGeneration.ts   # 圖片生成工具
│   │   └── browser/      # 瀏覽器自動化工具
│   │       ├── browse.ts # URL 瀏覽
│   │       ├── screenshot.ts    # 截圖擷取
│   │       └── extract.ts       # 資料提取
│   ├── permissions/      # 權限系統
│   │   └── manager.ts    # 權限管理器
│   ├── quota/            # 配額管理
│   │   └── tracker.ts    # Token 和請求追蹤
│   ├── types/            # TypeScript 類型
│   ├── config.ts         # 設定載入器
│   └── index.ts          # 進入點
├── config/               # 設定檔案
├── data/                 # 執行時資料
│   └── users.json        # 使用者權限
├── logs/                 # 日誌檔案
├── tests/                # 測試套件
├── docs/                 # 文件
├── start.sh              # 啟動腳本
├── stop.sh               # 停止腳本
├── status.sh             # 狀態檢查腳本
├── .env.example          # 環境變數範本
└── README.md             # 本檔案
```

## 安全性

- 所有寫入操作需要明確的使用者確認
- 路徑限制於 `ALLOWED_PATHS`
- 防止路徑遍歷攻擊
- 封鎖敏感檔案存取 (`.ssh/`、`.env` 等)
- 使用者驗證 (只有 `ALLOWED_USERS` 可以使用機器人)
- Token 使用量追蹤和配額限制

## 疑難排解

### 機器人無法啟動

```bash
# 檢查環境變數
cat .env

# 檢查依賴項
bun install

# 查看錯誤日誌
cat bot.log

# 檢查連接埠是否被佔用
./status.sh
```

### 圖片生成失敗

```bash
# 確認 GOOGLE_API_KEY 已正確設定
echo $GOOGLE_API_KEY

# 確認 mcp-image 可以正常執行
npx -y mcp-image --help

# 檢查機器人日誌以取得詳細錯誤訊息
cat bot.log | grep ImageGen
```

常見問題:
- **API Key 無效**: 確認 `GOOGLE_API_KEY` 在 `.env` 中正確設定
- **連線錯誤**: 檢查網路連線,稍後重試
- **配額不足**: 在 Google AI Studio 檢查 API 配額

### 權限錯誤

- 驗證您的 User ID 在 `TELEGRAM_ALLOWED_USERS` 中
- 驗證檔案路徑在 `ALLOWED_PATHS` 範圍內
- 檢查主機系統的檔案權限

### 配額不足

檢查您的配額狀態:
- `/status` 指令顯示當前使用量
- 配額會根據時間窗口重置 (每小時/每日)
- 在 `.env` 中調整限制:
  - `MAX_REQUESTS_PER_HOUR`
  - `MAX_TOKENS_PER_DAY`

### 瀏覽器自動化失敗

```bash
# 如果尚未安裝,請安裝 Playwright 瀏覽器
npx playwright install chromium

# 檢查瀏覽器是否正確安裝
npx playwright install --dry-run

# 若 headless 模式有問題,嘗試使用 headless=false
# 在 .env 中設定:
BROWSER_HEADLESS=false

# 針對載入慢的網站增加逾時時間 (毫秒)
BROWSER_TIMEOUT=60000
```

## 開發

### 以開發模式執行

```bash
# 直接執行 (前景)
bun run src/index.ts

# 自動重載執行
bun --watch run src/index.ts
```

### 執行測試

```bash
bun test
```

### TypeScript 類型檢查

```bash
bun run typecheck
```

### 程式碼結構指南

- 保持函式簡短 (<50 行)
- 使用不可變模式 (無突變)
- 總是使用 try-catch 處理錯誤
- 使用 Zod 驗證所有使用者輸入
- 為新功能撰寫測試

## 設定

所有設定透過 `.env` 的環境變數完成:

| 變數 | 說明 | 預設值 |
|------|------|--------|
| `TELEGRAM_BOT_TOKEN` | Telegram Bot API token | (必填) |
| `TELEGRAM_ALLOWED_USERS` | 逗號分隔的使用者 ID | (必填) |
| `GOOGLE_API_KEY` | Google Gemini API key | (必填) |
| `GEMINI_DEFAULT_MODEL` | 使用的 Gemini 模型 | `gemini-3-pro-preview` |
| `ALLOWED_PATHS` | 允許的目錄路徑 | `~/Documents,~/Downloads,~/Desktop` |
| `DEFAULT_WORKING_DIR` | 預設工作目錄 | `~/Documents` |
| `MAX_REQUESTS_PER_HOUR` | 每小時請求限制 | `100` |
| `MAX_TOKENS_PER_DAY` | 每日 token 限制 | `1000000` |
| `BROWSER_HEADLESS` | 以 headless 模式執行瀏覽器 | `true` |
| `BROWSER_TIMEOUT` | 瀏覽器操作逾時時間 (毫秒) | `30000` |

## 架構

### 對話流程

1. 使用者傳送訊息給機器人
2. 機器人將訊息加入對話歷史
3. Gemini 處理訊息並決定是否需要工具
4. 如果需要工具:
   - Gemini 呼叫適當的工具函式
   - 機器人請求使用者確認 (寫入操作)
   - 核准後,工具執行並回傳結果
   - 結果傳回給 Gemini 以產生回應
5. Gemini 生成最終回應
6. 回應傳送給使用者

### 權限系統

- **讀取操作**: 自動核准 (安全操作)
- **寫入操作**: 需要使用者確認 (破壞性操作)
- **圖片生成**: 自動執行 (避免逾時問題)
- 透過內嵌鍵盤按鈕確認 (允許/拒絕)
- 確認逾時 120 秒

### 配額系統

追蹤:
- 每小時請求數
- 每日消耗的 tokens
- 達到 80% 閾值時警告
- 硬性限制強制執行

## 貢獻

歡迎貢獻!請:

1. Fork 本專案
2. 建立功能分支
3. 為新功能撰寫測試
4. 確保所有測試通過
5. 提交 pull request

## 授權

MIT

## 支援

如有問題或疑問:
- 在 GitHub 開啟 issue
- 查看 `/docs` 中的現有文件
- 查看測試檔案以了解使用範例

## 致謝

- 使用 [Grammy](https://grammy.dev/) 建構 - Telegram Bot 框架
- 由 [Google Gemini](https://ai.google.dev/) 驅動 - AI 模型
- 透過 [mcp-image](https://github.com/anthropics/mcp-image) 生成圖片 - Gemini 2.5 Flash Image MCP 伺服器
- 執行環境使用 [Bun](https://bun.sh/) - 快速 JavaScript 執行環境
