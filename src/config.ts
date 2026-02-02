import { config as loadEnv } from 'dotenv'
import { ConfigSchema, type Config } from './types/config'
import { resolve } from 'path'
import { homedir } from 'os'

loadEnv()

function expandPath(path: string): string {
  return path.replace(/^~/, homedir())
}

export function loadConfig(): Config {
  const rawConfig = {
    telegram: {
      botToken: process.env.TELEGRAM_BOT_TOKEN || '',
      allowedUsers: (process.env.TELEGRAM_ALLOWED_USERS || '')
        .split(',')
        .filter(Boolean)
        .map(Number),
    },
    gemini: {
      apiKey: process.env.GOOGLE_API_KEY || '',
      defaultModel: (process.env.GEMINI_DEFAULT_MODEL || 'gemini-2.0-flash-exp') as any,
    },
    workingDirectory: {
      allowedPaths: (process.env.ALLOWED_PATHS || '~/Documents,~/Downloads,~/Desktop')
        .split(',')
        .map(expandPath),
      defaultWorkingDir: expandPath(process.env.DEFAULT_WORKING_DIR || '~/Documents'),
    },
    quotaLimits: {
      maxRequestsPerHour: parseInt(process.env.MAX_REQUESTS_PER_HOUR || '100', 10),
      maxTokensPerDay: parseInt(process.env.MAX_TOKENS_PER_DAY || '1000000', 10),
      warningThreshold: 80,
    },
    browser: {
      headless: process.env.BROWSER_HEADLESS !== 'false',
      timeout: parseInt(process.env.BROWSER_TIMEOUT || '30000', 10),
    },
    fileLimits: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 10MB default
      maxContentSize: parseInt(process.env.MAX_CONTENT_SIZE || '5242880', 10), // 5MB default
    },
  }

  return ConfigSchema.parse(rawConfig)
}

export const config = loadConfig()
