import type { Tool, ToolResult } from '../../types/tool'
import { chromium } from 'playwright'
import { config } from '../../config'

/**
 * Tool for browsing a URL and extracting its content
 */
export const browseUrlTool: Tool = {
  name: 'browse_url',
  description: 'Navigate to a URL and extract its content (title and text)',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to visit (must start with http:// or https://)',
      },
    },
    required: ['url'],
  },
  requiresConfirmation: false, // Browsing is a read operation
  execute: async (params): Promise<ToolResult> => {
    const { url } = params

    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return {
        success: false,
        error: 'URL must start with http:// or https://',
      }
    }

    try {
      const browser = await chromium.launch({
        headless: config.browser.headless,
        timeout: config.browser.timeout,
      })

      const page = await browser.newPage()

      await page.goto(url, {
        waitUntil: 'networkidle',
        timeout: config.browser.timeout,
      })

      // Extract page content
      const title = await page.title()
      const content = await page.textContent('body')

      await browser.close()

      return {
        success: true,
        data: {
          url,
          title,
          content: content?.slice(0, 5000) || '', // Limit to 5000 chars to avoid overwhelming Gemini
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to browse URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  },
}
