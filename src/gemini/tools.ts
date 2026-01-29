import type { Tool, ToolResult } from '../types/tool'
import type { UserSession } from '../types/session'

/**
 * Gemini Function Declaration format
 * @see https://ai.google.dev/gemini-api/docs/function-calling
 */
export interface GeminiFunctionDeclaration {
  name: string
  description: string
  parameters: Record<string, any>
}

/**
 * Registry for managing available tools that can be called by Gemini
 */
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map()

  /**
   * Register a new tool
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool)
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name)
  }

  /**
   * Get all tools in Gemini function declarations format
   */
  getGeminiToolDeclarations(): any[] {
    const declarations: GeminiFunctionDeclaration[] = []

    for (const tool of this.tools.values()) {
      declarations.push({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters
      })
    }

    // Gemini API expects tools in this format: [{ functionDeclarations: [...] }]
    return declarations.length > 0 ? [{ functionDeclarations: declarations }] : []
  }

  /**
   * Execute a tool by name
   */
  async executeTool(name: string, params: any, session: UserSession): Promise<ToolResult> {
    const tool = this.getTool(name)
    if (!tool) {
      throw new Error(`Tool not found: ${name}`)
    }

    return tool.execute(params, session)
  }
}
