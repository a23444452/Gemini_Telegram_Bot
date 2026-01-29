import type { Tool, ToolResult } from '../../types/tool'
import { chromium } from 'playwright'
import { config } from '../../config'

/**
 * Tool for taking a screenshot of a webpage
 */
export const screenshotUrlTool: Tool = {
  name: 'screenshot_url',
  description: 'Take a screenshot of a webpage and return it as base64-encoded PNG',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to screenshot (must start with http:// or https://)',
      },
      fullPage: {
        type: 'boolean',
        description: 'Capture full page or just viewport (default: false)',
      },
    },
    required: ['url'],
  },
  requiresConfirmation: false,
  execute: async (params): Promise<ToolResult> => {
    const { url, fullPage = false } = params

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

      const screenshot = await page.screenshot({
        fullPage,
        type: 'png',
      })

      await browser.close()

      // Convert to base64
      const base64 = screenshot.toString('base64')

      return {
        success: true,
        data: {
          image: base64,
          url,
          fullPage,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to screenshot: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  },
}
