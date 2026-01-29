import type { Tool } from '../../types/tool'
import { browseUrlTool } from '../browser/browse'

/**
 * Tool for web search by browsing multiple URLs
 */
export const webSearchTool: Tool = {
  name: 'web_search',
  description: 'Search the web by browsing multiple URLs and aggregating their content',
  parameters: {
    type: 'object',
    properties: {
      urls: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of URLs to browse and search'
      },
      query: {
        type: 'string',
        description: 'Search query or topic to focus on when extracting content'
      }
    },
    required: ['urls']
  },
  requiresConfirmation: false,
  execute: async (params, session) => {
    const { urls, query } = params

    if (!Array.isArray(urls) || urls.length === 0) {
      return {
        success: false,
        error: 'At least one URL is required'
      }
    }

    if (urls.length > 10) {
      return {
        success: false,
        error: 'Maximum 10 URLs allowed per search'
      }
    }

    try {
      const results = []

      // Browse each URL
      for (const url of urls) {
        try {
          const result = await browseUrlTool.execute({ url }, session)

          if (result.success && result.data) {
            results.push({
              url,
              success: true,
              content: result.data.content,
              title: result.data.title
            })
          } else {
            results.push({
              url,
              success: false,
              error: result.error || 'Failed to browse URL'
            })
          }
        } catch (error) {
          results.push({
            url,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      const successCount = results.filter(r => r.success).length
      const failCount = results.filter(r => !r.success).length

      // Aggregate content from successful results
      const aggregatedContent = results
        .filter(r => r.success)
        .map(r => `\n## ${r.title || r.url}\nSource: ${r.url}\n\n${r.content}\n`)
        .join('\n---\n')

      return {
        success: true,
        data: {
          query,
          results,
          summary: `Browsed ${urls.length} URLs: ${successCount} successful, ${failCount} failed`,
          aggregatedContent,
          successCount,
          failCount
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

/**
 * Tool for generating reports from search results
 */
export const generateReportTool: Tool = {
  name: 'generate_report',
  description: 'Generate a structured report by searching multiple sources and synthesizing information',
  parameters: {
    type: 'object',
    properties: {
      topic: {
        type: 'string',
        description: 'The topic or subject of the research report'
      },
      urls: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of URLs to use as sources for the report'
      },
      sections: {
        type: 'array',
        items: { type: 'string' },
        description: 'Optional list of section titles to include in the report'
      }
    },
    required: ['topic', 'urls']
  },
  requiresConfirmation: false,
  execute: async (params, session) => {
    const { topic, urls, sections } = params

    // First, search the web
    const searchResult = await webSearchTool.execute({ urls, query: topic }, session)

    if (!searchResult.success || !searchResult.data) {
      return searchResult
    }

    const { aggregatedContent, successCount, failCount } = searchResult.data as any

    // Generate report structure
    const reportSections = sections || [
      'Overview',
      'Key Findings',
      'Detailed Analysis',
      'Sources'
    ]

    const report = `# Research Report: ${topic}

**Generated:** ${new Date().toISOString().split('T')[0]}
**Sources:** ${successCount} URLs browsed successfully${failCount > 0 ? `, ${failCount} failed` : ''}

---

## Aggregated Content from Sources

${aggregatedContent}

---

## Report Sections

${reportSections.map(section => `### ${section}\n\n[Content to be analyzed by Gemini]\n`).join('\n')}

---

## Instructions for Analysis

Please analyze the aggregated content above and fill in the report sections based on:
1. ${reportSections[0]}: Provide a high-level summary
2. ${reportSections[1]}: Extract the most important findings
3. ${reportSections[2]}: Provide detailed analysis of key points
4. ${reportSections[3] || 'Sources'}: List all sources used

`

    return {
      success: true,
      data: {
        topic,
        report,
        sourcesCount: successCount,
        reportSections,
        message: 'Report template generated. Please analyze the content and fill in the sections.'
      }
    }
  }
}

/**
 * Tool for comparing information across multiple sources
 */
export const compareSourcesTool: Tool = {
  name: 'compare_sources',
  description: 'Compare and contrast information from multiple web sources',
  parameters: {
    type: 'object',
    properties: {
      urls: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of URLs to compare (2-5 URLs recommended)'
      },
      topic: {
        type: 'string',
        description: 'The specific topic or aspect to compare across sources'
      }
    },
    required: ['urls']
  },
  requiresConfirmation: false,
  execute: async (params, session) => {
    const { urls, topic } = params

    if (!Array.isArray(urls) || urls.length < 2) {
      return {
        success: false,
        error: 'At least 2 URLs are required for comparison'
      }
    }

    if (urls.length > 5) {
      return {
        success: false,
        error: 'Maximum 5 URLs allowed for comparison'
      }
    }

    // Search the web
    const searchResult = await webSearchTool.execute({ urls, query: topic }, session)

    if (!searchResult.success || !searchResult.data) {
      return searchResult
    }

    const { results } = searchResult.data as any

    // Create comparison table
    const comparison = `# Source Comparison${topic ? `: ${topic}` : ''}

## Sources Overview

${results.map((r: any, i: number) =>
  `**Source ${i + 1}**: ${r.title || 'Untitled'}\n` +
  `URL: ${r.url}\n` +
  `Status: ${r.success ? '✅ Success' : '❌ Failed'}\n`
).join('\n')}

---

## Content Comparison

${results.filter((r: any) => r.success).map((r: any, i: number) =>
  `### Source ${i + 1}: ${r.title || r.url}\n\n${r.content}\n\n---\n`
).join('\n')}

## Analysis Instructions

Please compare these sources and identify:
1. Common points across all sources
2. Unique information from each source
3. Contradictions or disagreements
4. Most reliable/credible information
`

    return {
      success: true,
      data: {
        comparison,
        sourcesCompared: results.filter((r: any) => r.success).length,
        message: 'Comparison prepared. Please analyze the differences and similarities.'
      }
    }
  }
}
