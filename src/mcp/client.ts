import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'

export interface MCPToolInfo {
  name: string
  description?: string
  inputSchema?: Record<string, any>
}

export class MCPClient {
  private client: Client | null = null
  private transport: StdioClientTransport | null = null
  private isConnected = false

  /**
   * Connect to an MCP server using stdio transport
   * @param serverCommand Command to start the server (e.g., 'npx')
   * @param serverArgs Arguments for the command (e.g., ['-y', 'nanobanana'])
   */
  async connect(serverCommand: string, serverArgs: string[]): Promise<void> {
    if (this.isConnected) {
      throw new Error('Client is already connected')
    }

    try {
      this.transport = new StdioClientTransport({
        command: serverCommand,
        args: serverArgs
      })

      this.client = new Client(
        {
          name: 'gemini-telegram-bot',
          version: '1.0.0'
        },
        {
          capabilities: {}
        }
      )

      await this.client.connect(this.transport)
      this.isConnected = true
    } catch (error: any) {
      this.isConnected = false
      throw new Error(`Failed to connect to MCP server: ${error.message}`)
    }
  }

  /**
   * List all available tools from the connected MCP server
   */
  async listTools(): Promise<MCPToolInfo[]> {
    this.ensureConnected()

    try {
      const response = await this.client!.listTools()
      return response.tools.map((tool: any) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }))
    } catch (error: any) {
      throw new Error(`Failed to list tools: ${error.message}`)
    }
  }

  /**
   * Call a tool on the connected MCP server
   * @param name Tool name
   * @param args Tool arguments
   * @returns Tool response content
   */
  async callTool(name: string, args: Record<string, any>): Promise<any> {
    this.ensureConnected()

    try {
      const response = await this.client!.callTool({
        name,
        arguments: args
      })
      return response.content
    } catch (error: any) {
      throw new Error(`Failed to call tool '${name}': ${error.message}`)
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return
    }

    try {
      if (this.client) {
        await this.client.close()
      }
    } catch (error: any) {
      console.error('Error disconnecting MCP client:', error)
    } finally {
      this.client = null
      this.transport = null
      this.isConnected = false
    }
  }

  /**
   * Check if the client is connected
   */
  getConnectionStatus(): boolean {
    return this.isConnected
  }

  private ensureConnected(): void {
    if (!this.isConnected || !this.client) {
      throw new Error('Client is not connected. Call connect() first.')
    }
  }
}

/**
 * Create a new MCP client, execute a tool call, and disconnect
 * Helper function for one-time tool calls
 */
export async function executeMCPTool(
  serverCommand: string,
  serverArgs: string[],
  toolName: string,
  toolArgs: Record<string, any>
): Promise<any> {
  const client = new MCPClient()

  try {
    await client.connect(serverCommand, serverArgs)
    const result = await client.callTool(toolName, toolArgs)
    return result
  } finally {
    await client.disconnect()
  }
}
