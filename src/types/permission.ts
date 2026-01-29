/**
 * Permission request for tool execution
 */
export interface PermissionRequest {
  toolName: string
  params: Record<string, any>
  userId: number
  timestamp: Date
}

/**
 * Permission response from user
 */
export interface PermissionResponse {
  approved: boolean
  userId: number
  toolName: string
}
