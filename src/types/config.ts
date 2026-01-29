import { z } from 'zod'

export const ConfigSchema = z.object({
  telegram: z.object({
    botToken: z.string().min(1),
    allowedUsers: z.array(z.number()),
  }),
  gemini: z.object({
    apiKey: z.string().min(1),
    defaultModel: z.enum(['gemini-2.0-flash-exp', 'gemini-1.5-pro']),
  }),
  workingDirectory: z.object({
    allowedPaths: z.array(z.string()),
    defaultWorkingDir: z.string(),
  }),
  quotaLimits: z.object({
    maxRequestsPerHour: z.number().int().positive(),
    maxTokensPerDay: z.number().int().positive(),
    warningThreshold: z.number().int().min(0).max(100),
  }),
  browser: z.object({
    headless: z.boolean(),
    timeout: z.number().int().positive(),
  }),
})

export type Config = z.infer<typeof ConfigSchema>
