import fs from 'fs/promises'
import path from 'path'
import type { Tool } from '../types/tool'
import { validatePath } from '../permissions/pathValidator'

/**
 * Tool for reading file contents
 */
export const readFileTool: Tool = {
  name: 'read_file',
  description: 'Read the contents of a text file within the allowed working directory',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to read (relative to current working directory or absolute)'
      }
    },
    required: ['path']
  },
  requiresConfirmation: false,
  execute: async (params, session) => {
    const { path: filePath } = params

    // Validate path
    const validation = validatePath(filePath, session)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      }
    }

    try {
      // Check if file exists
      const stats = await fs.stat(validation.resolvedPath!)
      if (!stats.isFile()) {
        return {
          success: false,
          error: 'Path is not a file'
        }
      }

      // Read file contents
      const content = await fs.readFile(validation.resolvedPath!, 'utf-8')
      return {
        success: true,
        data: content
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

/**
 * Tool for listing directory contents
 */
export const listDirectoryTool: Tool = {
  name: 'list_directory',
  description: 'List contents of a directory within the allowed working directory',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the directory to list (relative to current working directory or absolute). Use "." for current directory.'
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

      // Read directory contents
      const entries = await fs.readdir(validation.resolvedPath!, { withFileTypes: true })

      // Format entries with type indicators
      const formattedEntries = entries.map(entry => {
        const type = entry.isDirectory() ? 'dir' : entry.isFile() ? 'file' : 'other'
        return {
          name: entry.name,
          type,
          path: path.join(validation.resolvedPath!, entry.name)
        }
      })

      return {
        success: true,
        data: {
          path: validation.resolvedPath,
          entries: formattedEntries
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to list directory: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}
