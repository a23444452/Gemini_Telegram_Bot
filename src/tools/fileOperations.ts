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

/**
 * Tool for writing content to a file
 */
export const writeFileTool: Tool = {
  name: 'write_file',
  description: 'Write content to a text file. This will overwrite the file if it exists.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to write (relative to current working directory or absolute)'
      },
      content: {
        type: 'string',
        description: 'Content to write to the file'
      }
    },
    required: ['path', 'content']
  },
  requiresConfirmation: true,
  execute: async (params, session) => {
    const { path: filePath, content } = params

    // Validate path
    const validation = validatePath(filePath, session)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      }
    }

    try {
      // Create parent directories if they don't exist
      const dirPath = path.dirname(validation.resolvedPath!)
      await fs.mkdir(dirPath, { recursive: true })

      // Write file
      await fs.writeFile(validation.resolvedPath!, content, 'utf-8')

      return {
        success: true,
        data: `File written successfully: ${validation.resolvedPath}`
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to write file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

/**
 * Tool for appending content to a file
 */
export const appendFileTool: Tool = {
  name: 'append_file',
  description: 'Append content to the end of a text file. Creates the file if it does not exist.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to append to (relative to current working directory or absolute)'
      },
      content: {
        type: 'string',
        description: 'Content to append to the file'
      }
    },
    required: ['path', 'content']
  },
  requiresConfirmation: true,
  execute: async (params, session) => {
    const { path: filePath, content } = params

    // Validate path
    const validation = validatePath(filePath, session)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      }
    }

    try {
      // Append to file (creates if doesn't exist)
      await fs.appendFile(validation.resolvedPath!, content, 'utf-8')

      return {
        success: true,
        data: `Content appended successfully: ${validation.resolvedPath}`
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to append to file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

/**
 * Tool for deleting a file
 */
export const deleteFileTool: Tool = {
  name: 'delete_file',
  description: 'Delete a file. This operation cannot be undone.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file to delete (relative to current working directory or absolute)'
      }
    },
    required: ['path']
  },
  requiresConfirmation: true,
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
      // Delete file
      await fs.unlink(validation.resolvedPath!)

      return {
        success: true,
        data: `File deleted successfully: ${validation.resolvedPath}`
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

/**
 * Tool for creating a directory
 */
export const createDirectoryTool: Tool = {
  name: 'create_directory',
  description: 'Create a new directory. Creates parent directories if needed.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the directory to create (relative to current working directory or absolute)'
      }
    },
    required: ['path']
  },
  requiresConfirmation: true,
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
      // Create directory (recursive)
      await fs.mkdir(validation.resolvedPath!, { recursive: true })

      return {
        success: true,
        data: `Directory created successfully: ${validation.resolvedPath}`
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to create directory: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

/**
 * Tool for moving/renaming a file
 */
export const moveFileTool: Tool = {
  name: 'move_file',
  description: 'Move or rename a file. This will overwrite the destination if it exists.',
  parameters: {
    type: 'object',
    properties: {
      source: {
        type: 'string',
        description: 'Path to the source file (relative to current working directory or absolute)'
      },
      destination: {
        type: 'string',
        description: 'Path to the destination (relative to current working directory or absolute)'
      }
    },
    required: ['source', 'destination']
  },
  requiresConfirmation: true,
  execute: async (params, session) => {
    const { source, destination } = params

    // Validate source path
    const sourceValidation = validatePath(source, session)
    if (!sourceValidation.valid) {
      return {
        success: false,
        error: `Source: ${sourceValidation.error}`
      }
    }

    // Validate destination path
    const destValidation = validatePath(destination, session)
    if (!destValidation.valid) {
      return {
        success: false,
        error: `Destination: ${destValidation.error}`
      }
    }

    try {
      // Move/rename file
      await fs.rename(sourceValidation.resolvedPath!, destValidation.resolvedPath!)

      return {
        success: true,
        data: `File moved successfully: ${sourceValidation.resolvedPath} -> ${destValidation.resolvedPath}`
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to move file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

/**
 * Tool for copying a file
 */
export const copyFileTool: Tool = {
  name: 'copy_file',
  description: 'Copy a file to a new location. This will overwrite the destination if it exists.',
  parameters: {
    type: 'object',
    properties: {
      source: {
        type: 'string',
        description: 'Path to the source file (relative to current working directory or absolute)'
      },
      destination: {
        type: 'string',
        description: 'Path to the destination (relative to current working directory or absolute)'
      }
    },
    required: ['source', 'destination']
  },
  requiresConfirmation: true,
  execute: async (params, session) => {
    const { source, destination } = params

    // Validate source path
    const sourceValidation = validatePath(source, session)
    if (!sourceValidation.valid) {
      return {
        success: false,
        error: `Source: ${sourceValidation.error}`
      }
    }

    // Validate destination path
    const destValidation = validatePath(destination, session)
    if (!destValidation.valid) {
      return {
        success: false,
        error: `Destination: ${destValidation.error}`
      }
    }

    try {
      // Copy file
      await fs.copyFile(sourceValidation.resolvedPath!, destValidation.resolvedPath!)

      return {
        success: true,
        data: `File copied successfully: ${sourceValidation.resolvedPath} -> ${destValidation.resolvedPath}`
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to copy file: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}
