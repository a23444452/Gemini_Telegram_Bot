import { describe, it, expect } from 'bun:test'
import { ConfigSchema } from '../../src/types/config'

describe('Config', () => {
  it('should validate valid config', () => {
    const validConfig = {
      telegram: {
        botToken: 'test_token',
        allowedUsers: [123, 456],
      },
      gemini: {
        apiKey: 'test_key',
        defaultModel: 'gemini-2.0-flash-exp' as const,
      },
      workingDirectory: {
        allowedPaths: ['/home/user/Documents'],
        defaultWorkingDir: '/home/user/Documents',
      },
      quotaLimits: {
        maxRequestsPerHour: 100,
        maxTokensPerDay: 1000000,
        warningThreshold: 80,
      },
      browser: {
        headless: true,
        timeout: 30000,
      },
    }

    expect(() => ConfigSchema.parse(validConfig)).not.toThrow()
  })
})
