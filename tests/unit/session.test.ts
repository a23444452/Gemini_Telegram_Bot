import { describe, it, expect, beforeEach } from 'bun:test'
import { sessionManager } from '../../src/bot/middleware/session'

describe('SessionManager', () => {
  const testUserId = 999999

  it('should create new session for new user', () => {
    const session = sessionManager.getSession(testUserId)
    expect(session.userId).toBe(testUserId)
    expect(session.geminiContext).toEqual([])
    expect(session.currentWorkingDir).toBeTruthy()
  })

  it('should update session', () => {
    const newDir = '/test/directory'
    sessionManager.updateSession(testUserId, { currentWorkingDir: newDir })
    const session = sessionManager.getSession(testUserId)
    expect(session.currentWorkingDir).toBe(newDir)
  })

  it('should clear context', () => {
    sessionManager.updateSession(testUserId, {
      geminiContext: [{ role: 'user', parts: [{ text: 'test' }] }],
    })
    sessionManager.clearContext(testUserId)
    const session = sessionManager.getSession(testUserId)
    expect(session.geminiContext).toEqual([])
  })
})
