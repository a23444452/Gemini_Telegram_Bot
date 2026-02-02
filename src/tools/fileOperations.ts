import fs from 'fs/promises'
import path from 'path'
import type { Tool } from '../types/tool'
import { validatePath } from '../permissions/pathValidator'
import { config } from '../config'

/**
 * Format bytes to human readable size
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

/**
 * Format file permissions to human readable string (e.g., "rw-r--r--")
 */
function formatPermissions(mode: number): string {
  const octal = (mode & 0o777).toString(8)
  const permMap: { [key: string]: string } = {
    '0': '---',
    '1': '--x',
    '2': '-w-',
    '3': '-wx',
    '4': 'r--',
    '5': 'r-x',
    '6': 'rw-',
    '7': 'rwx'
  }
  return octal.split('').map(d => permMap[d]).join('')
}

/**
 * Tool for getting file or directory information
 */
export const fileInfoTool: Tool = {
  name: 'file_info',
  description: 'Get detailed information about a file or directory (size, permissions, timestamps, type)',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the file or directory (relative to current working directory or absolute)'
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
      // Get file/directory stats
      const stats = await fs.stat(validation.resolvedPath!)

      // Determine type
      let type: string
      if (stats.isFile()) type = 'file'
      else if (stats.isDirectory()) type = 'directory'
      else if (stats.isSymbolicLink()) type = 'symlink'
      else if (stats.isBlockDevice()) type = 'block-device'
      else if (stats.isCharacterDevice()) type = 'character-device'
      else if (stats.isFIFO()) type = 'fifo'
      else if (stats.isSocket()) type = 'socket'
      else type = 'unknown'

      // Get directory item count if it's a directory
      let itemCount: number | undefined
      if (stats.isDirectory()) {
        try {
          const entries = await fs.readdir(validation.resolvedPath!)
          itemCount = entries.length
        } catch {
          // Ignore errors reading directory
        }
      }

      // Build info object
      const info = {
        path: validation.resolvedPath,
        name: path.basename(validation.resolvedPath!),
        type,
        size: stats.size,
        sizeHuman: formatBytes(stats.size),
        permissions: formatPermissions(stats.mode),
        permissionsOctal: (stats.mode & 0o777).toString(8),
        owner: {
          uid: stats.uid,
          gid: stats.gid,
        },
        timestamps: {
          created: stats.birthtime.toISOString(),
          modified: stats.mtime.toISOString(),
          accessed: stats.atime.toISOString(),
          changed: stats.ctime.toISOString(),
        },
        ...(itemCount !== undefined && { itemCount }),
      }

      return {
        success: true,
        data: info
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to get file info: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

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

      // Check file size limit
      if (stats.size > config.fileLimits.maxFileSize) {
        return {
          success: false,
          error: `File too large: ${formatBytes(stats.size)} (max: ${formatBytes(config.fileLimits.maxFileSize)})`
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

    // Check content size limit
    const contentSize = Buffer.byteLength(content, 'utf-8')
    if (contentSize > config.fileLimits.maxContentSize) {
      return {
        success: false,
        error: `Content too large: ${formatBytes(contentSize)} (max: ${formatBytes(config.fileLimits.maxContentSize)})`
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

    // Check content size limit
    const contentSize = Buffer.byteLength(content, 'utf-8')
    if (contentSize > config.fileLimits.maxContentSize) {
      return {
        success: false,
        error: `Content too large: ${formatBytes(contentSize)} (max: ${formatBytes(config.fileLimits.maxContentSize)})`
      }
    }

    try {
      // Check if file exists and get current size
      let currentSize = 0
      try {
        const stats = await fs.stat(validation.resolvedPath!)
        currentSize = stats.size
      } catch {
        // File doesn't exist, currentSize stays 0
      }

      // Check if appending would exceed the limit
      const totalSize = currentSize + contentSize
      if (totalSize > config.fileLimits.maxFileSize) {
        return {
          success: false,
          error: `Resulting file would be too large: ${formatBytes(totalSize)} (max: ${formatBytes(config.fileLimits.maxFileSize)})`
        }
      }

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
 * Tool for deleting a directory
 */
export const deleteDirectoryTool: Tool = {
  name: 'delete_directory',
  description: 'Delete a directory and optionally all its contents. This operation cannot be undone.',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the directory to delete (relative to current working directory or absolute)'
      },
      recursive: {
        type: 'boolean',
        description: 'Delete non-empty directories and all contents (default: false for safety)',
      }
    },
    required: ['path']
  },
  requiresConfirmation: true,
  execute: async (params, session) => {
    const { path: dirPath, recursive = false } = params

    // Validate path
    const validation = validatePath(dirPath, session)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      }
    }

    try {
      // Check if path exists and is a directory
      const stats = await fs.stat(validation.resolvedPath!)
      if (!stats.isDirectory()) {
        return {
          success: false,
          error: 'Path is not a directory'
        }
      }

      // Check if directory is empty
      const entries = await fs.readdir(validation.resolvedPath!)
      if (entries.length > 0 && !recursive) {
        return {
          success: false,
          error: `Directory is not empty (contains ${entries.length} items). Use recursive=true to delete non-empty directories.`
        }
      }

      // Delete directory
      await fs.rm(validation.resolvedPath!, { recursive: true, force: false })

      return {
        success: true,
        data: `Directory deleted successfully: ${validation.resolvedPath}`
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to delete directory: ${error instanceof Error ? error.message : 'Unknown error'}`
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
      // Check source file size
      const stats = await fs.stat(sourceValidation.resolvedPath!)
      if (stats.size > config.fileLimits.maxFileSize) {
        return {
          success: false,
          error: `Source file too large: ${formatBytes(stats.size)} (max: ${formatBytes(config.fileLimits.maxFileSize)})`
        }
      }

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
