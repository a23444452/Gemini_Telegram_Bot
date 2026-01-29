import type { UserSession } from './session'

export interface Tool {
  name: string
  description: string
  parameters: Record<string, any> // JSON Schema
  execute: (params: any, session: UserSession) => Promise<ToolResult>
  requiresConfirmation: boolean
}

export interface ToolResult {
  success: boolean
  data?: any
  error?: string
}
