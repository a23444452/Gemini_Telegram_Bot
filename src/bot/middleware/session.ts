import { existsSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import type { UserSession } from '../../types/session'
import { config } from '../../config'

const USERS_FILE = join(process.cwd(), 'data', 'users.json')

class SessionManager {
  private sessions: Map<number, UserSession> = new Map()

  constructor() {
    this.loadSessions()
  }

  private loadSessions() {
    if (existsSync(USERS_FILE)) {
      try {
        const data = JSON.parse(readFileSync(USERS_FILE, 'utf-8'))
        Object.entries(data).forEach(([userId, session]: [string, any]) => {
          this.sessions.set(Number(userId), {
            ...session,
            lastActivity: new Date(session.lastActivity),
          })
        })
      } catch (error) {
        console.error('Failed to load sessions:', error)
      }
    }
  }

  private saveSessions() {
    const data: Record<number, any> = {}
    this.sessions.forEach((session, userId) => {
      data[userId] = session
    })
    writeFileSync(USERS_FILE, JSON.stringify(data, null, 2))
  }

  getSession(userId: number): UserSession {
    if (!this.sessions.has(userId)) {
      this.sessions.set(userId, {
        userId,
        currentWorkingDir: config.workingDirectory.defaultWorkingDir,
        allowedPaths: config.workingDirectory.allowedPaths,
        geminiContext: [],
        lastActivity: new Date(),
      })
      this.saveSessions()
    }

    const session = this.sessions.get(userId)!
    session.lastActivity = new Date()
    return session
  }

  updateSession(userId: number, updates: Partial<UserSession>) {
    const session = this.getSession(userId)
    Object.assign(session, updates)
    this.saveSessions()
  }

  clearContext(userId: number) {
    const session = this.getSession(userId)
    session.geminiContext = []
    this.saveSessions()
  }
}

export const sessionManager = new SessionManager()
