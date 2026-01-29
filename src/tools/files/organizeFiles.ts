import fs from 'fs/promises'
import path from 'path'
import type { Tool } from '../../types/tool'
import { validatePath } from '../../permissions/pathValidator'

/**
 * Categories for file organization
 */
interface FileCategory {
  name: string
  extensions: string[]
  count: number
  files: string[]
}

/**
 * Tool for analyzing files in a directory
 */
export const analyzeFilesTool: Tool = {
  name: 'analyze_files',
  description: 'Scan a directory and categorize files by type (images, documents, videos, etc.)',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the directory to analyze (relative to current working directory or absolute)'
      }
    },
    required: ['path']
  },
  requiresConfirmation: false,
  execute: async (params, session) => {
    const { path: dirPath } = params

    // Validate path
    const validation = validatePath(dirPath, session)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      }
    }

    try {
      // Check if directory exists
      const stats = await fs.stat(validation.resolvedPath!)
      if (!stats.isDirectory()) {
        return {
          success: false,
          error: 'Path is not a directory'
        }
      }

      // Read directory contents recursively (max depth 2)
      const files = await scanDirectory(validation.resolvedPath!, 2)

      // Categorize files
      const categories: FileCategory[] = [
        {
          name: 'Images',
          extensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'],
          count: 0,
          files: []
        },
        {
          name: 'Documents',
          extensions: ['.pdf', '.doc', '.docx', '.txt', '.md', '.rtf', '.odt'],
          count: 0,
          files: []
        },
        {
          name: 'Videos',
          extensions: ['.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.webm'],
          count: 0,
          files: []
        },
        {
          name: 'Audio',
          extensions: ['.mp3', '.wav', '.flac', '.aac', '.ogg', '.m4a'],
          count: 0,
          files: []
        },
        {
          name: 'Archives',
          extensions: ['.zip', '.rar', '.7z', '.tar', '.gz', '.bz2'],
          count: 0,
          files: []
        },
        {
          name: 'Code',
          extensions: ['.js', '.ts', '.py', '.java', '.cpp', '.c', '.go', '.rs', '.swift'],
          count: 0,
          files: []
        },
        {
          name: 'Other',
          extensions: [],
          count: 0,
          files: []
        }
      ]

      // Categorize each file
      for (const file of files) {
        const ext = path.extname(file).toLowerCase()
        let categorized = false

        for (const category of categories) {
          if (category.extensions.includes(ext)) {
            category.count++
            category.files.push(file)
            categorized = true
            break
          }
        }

        if (!categorized) {
          categories[categories.length - 1].count++
          categories[categories.length - 1].files.push(file)
        }
      }

      // Format response
      const summary = categories
        .filter(cat => cat.count > 0)
        .map(cat => `${cat.name}: ${cat.count} files`)
        .join('\n')

      return {
        success: true,
        data: {
          totalFiles: files.length,
          categories: categories.filter(cat => cat.count > 0),
          summary: `Total: ${files.length} files\n\n${summary}`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to analyze files: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

/**
 * Tool for suggesting file organization
 */
export const suggestOrganizationTool: Tool = {
  name: 'suggest_organization',
  description: 'Provide suggestions for organizing files based on their categories',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the directory to analyze (relative to current working directory or absolute)'
      }
    },
    required: ['path']
  },
  requiresConfirmation: false,
  execute: async (params, session) => {
    const { path: dirPath } = params

    // First, analyze files
    const analysisResult = await analyzeFilesTool.execute(params, session)

    if (!analysisResult.success || !analysisResult.data) {
      return analysisResult
    }

    const { categories, totalFiles } = analysisResult.data as any

    // Generate suggestions
    const suggestions: string[] = []

    for (const category of categories) {
      if (category.count > 5) {
        suggestions.push(
          `📁 Create "${category.name}" folder and move ${category.count} ${category.name.toLowerCase()} files`
        )
      }
    }

    if (suggestions.length === 0) {
      suggestions.push('✅ Directory is well-organized. No major changes needed.')
    } else {
      suggestions.unshift(
        `🔍 Found ${totalFiles} files that could be better organized:`,
        ''
      )
    }

    return {
      success: true,
      data: {
        suggestions: suggestions.join('\n'),
        categories
      }
    }
  }
}

/**
 * Helper function to recursively scan directory
 */
async function scanDirectory(dirPath: string, maxDepth: number, currentDepth = 0): Promise<string[]> {
  if (currentDepth >= maxDepth) {
    return []
  }

  const files: string[] = []

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name)

      if (entry.isFile()) {
        files.push(fullPath)
      } else if (entry.isDirectory()) {
        const subFiles = await scanDirectory(fullPath, maxDepth, currentDepth + 1)
        files.push(...subFiles)
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }

  return files
}
