import type { Tool, ToolResult } from '../../types/tool'
import { chromium } from 'playwright'
import { config } from '../../config'

/**
 * Tool for extracting specific data from a webpage using CSS selectors
 */
export const extractDataTool: Tool = {
  name: 'extract_data',
  description: 'Extract specific data from a webpage using a CSS selector',
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'URL to extract from (must start with http:// or https://)',
      },
      selector: {
        type: 'string',
        description: 'CSS selector for the element(s) to extract (e.g., "h1", ".class-name", "#id")',
      },
    },
    required: ['url', 'selector'],
  },
  requiresConfirmation: false,
  execute: async (params): Promise<ToolResult> => {
    const { url, selector } = params

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

      // Extract element text using the selector
      const elements = await page.$$eval(selector, (els) =>
        els.map((el) => el.textContent?.trim())
      )

      await browser.close()

      // Filter out empty results
      const results = elements.filter(Boolean) as string[]

      return {
        success: true,
        data: {
          url,
          selector,
          results,
          count: results.length,
        },
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to extract data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      }
    }
  },
}
