import type { Tool, ToolResult } from '../types/tool'
import type { UserSession } from '../types/session'
import { executeMCPTool } from '../mcp/client'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'

/**
 * AI Image Generation Tool using mcp-image MCP server
 * Connects to mcp-image MCP server to generate images using Gemini 2.5 Flash Image API
 */
export const generateImageTool: Tool = {
  name: 'generate_image',
  description: 'Generate a 2K resolution (2048x2048) square image using AI based on a text prompt. The AI will create a unique image matching your description.',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Detailed description of the image to generate. Be specific about style, colors, composition, and subject matter. The image will be generated at 2K (2048x2048) resolution in square format.'
      }
    },
    required: ['prompt']
  },
  requiresConfirmation: false, // Auto-execute without confirmation to avoid timeout issues
  execute: async (params, session: UserSession): Promise<ToolResult> => {
    const { prompt } = params

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return {
        success: false,
        error: 'Invalid prompt: must be a non-empty string'
      }
    }

    if (prompt.length > 1000) {
      return {
        success: false,
        error: 'Prompt too long: maximum 1000 characters'
      }
    }

    try {
      console.log(`[ImageGen] Generating 2K (2048x2048) image with prompt: ${prompt}`)

      // Get Gemini API key from environment
      const geminiApiKey = process.env.GOOGLE_API_KEY
      if (!geminiApiKey) {
        return {
          success: false,
          error: 'GOOGLE_API_KEY not configured in environment'
        }
      }

      // Call mcp-image MCP server to generate image
      // Server command: npx -y mcp-image
      // Tool name: generate_image
      // Generate square 1:1 aspect ratio image (2048x2048 for 2K resolution)
      const result = await executeMCPTool(
        'npx',
        ['-y', 'mcp-image'],
        'generate_image',
        {
          prompt,
          aspectRatio: '1:1' // Square format for 2K resolution (2048x2048)
        },
        {
          GEMINI_API_KEY: geminiApiKey
        }
      )

      console.log('[ImageGen] MCP tool response received')

      // Extract base64 image from MCP response
      // MCP returns content as an array of objects with type and text/data fields
      if (!result || !Array.isArray(result) || result.length === 0) {
        return {
          success: false,
          error: 'Invalid response from image generation service'
        }
      }

      // Find the image content in the response
      let imageBase64: string | null = null

      for (const item of result) {
        if (item.type === 'image') {
          // Image data is in the 'data' field for image type
          imageBase64 = item.data
          break
        } else if (item.type === 'text' && item.text) {
          const text = item.text

          // Check if it's a JSON resource response from mcp-image
          try {
            const parsed = JSON.parse(text)
            if (parsed.type === 'resource' && parsed.resource?.uri) {
              // Extract file path from file:// URI
              const filePath = fileURLToPath(parsed.resource.uri)
              console.log(`[ImageGen] Reading image from file: ${filePath}`)

              // Read the file and convert to base64
              const imageBuffer = readFileSync(filePath)
              imageBase64 = imageBuffer.toString('base64')
              console.log(`[ImageGen] Read ${imageBuffer.length} bytes from file`)
              break
            }
          } catch {
            // Not JSON, check other formats
          }

          // Check if it looks like base64 (starts with data:image or is pure base64)
          if (text.startsWith('data:image/')) {
            // Extract base64 from data URL
            imageBase64 = text.split(',')[1]
            break
          } else if (/^[A-Za-z0-9+/=]+$/.test(text) && text.length > 100) {
            // Looks like raw base64
            imageBase64 = text
            break
          }
        }
      }

      if (!imageBase64) {
        console.error('[ImageGen] Response structure:', JSON.stringify(result, null, 2))
        return {
          success: false,
          error: 'Failed to extract image data from response'
        }
      }

      console.log(`[ImageGen] Successfully generated image (${imageBase64.length} bytes base64)`)

      return {
        success: true,
        data: {
          image: imageBase64,
          prompt: prompt,
          message: `Image generated successfully for prompt: "${prompt}"`
        }
      }
    } catch (error: any) {
      console.error('[ImageGen] Error generating image:', error)

      // Provide user-friendly error messages
      let errorMessage = 'Failed to generate image'

      if (error.message.includes('ENOENT') || error.message.includes('command not found')) {
        errorMessage = 'Image generation service not available. Please ensure mcp-image is installed.'
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Image generation timed out. Please try again with a simpler prompt.'
      } else if (error.message.includes('rate limit')) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.'
      } else if (error.message) {
        errorMessage = `Failed to generate image: ${error.message}`
      }

      return {
        success: false,
        error: errorMessage
      }
    }
  }
}
