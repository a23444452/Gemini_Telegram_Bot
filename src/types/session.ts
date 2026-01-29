export interface UserSession {
  userId: number
  currentWorkingDir: string
  allowedPaths: string[]
  geminiContext: GeminiMessage[]
  lastActivity: Date
}

export interface GeminiMessage {
  role: 'user' | 'model'
  parts: Array<{ text: string }>
}
