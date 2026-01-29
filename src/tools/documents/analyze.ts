import fs from 'fs/promises'
import path from 'path'
import type { Tool } from '../../types/tool'
import { validatePath } from '../../permissions/pathValidator'

// Dynamic imports for optional dependencies
let pdfParse: any
let mammoth: any

/**
 * Lazy load pdf-parse
 */
async function loadPdfParse() {
  if (!pdfParse) {
    try {
      pdfParse = (await import('pdf-parse')).default
    } catch (error) {
      throw new Error('pdf-parse is not installed. Run: bun add pdf-parse')
    }
  }
  return pdfParse
}

/**
 * Lazy load mammoth
 */
async function loadMammoth() {
  if (!mammoth) {
    try {
      mammoth = await import('mammoth')
    } catch (error) {
      throw new Error('mammoth is not installed. Run: bun add mammoth')
    }
  }
  return mammoth
}

/**
 * Tool for analyzing PDF files
 */
export const analyzePdfTool: Tool = {
  name: 'analyze_pdf',
  description: 'Extract text content from a PDF file',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the PDF file (relative to current working directory or absolute)'
      },
      maxLength: {
        type: 'number',
        description: 'Maximum length of text to extract (default: 10000 characters)'
      }
    },
    required: ['path']
  },
  requiresConfirmation: false,
  execute: async (params, session) => {
    const { path: filePath, maxLength = 10000 } = params

    // Validate path
    const validation = validatePath(filePath, session)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      }
    }

    try {
      // Check if file exists and is a PDF
      const stats = await fs.stat(validation.resolvedPath!)
      if (!stats.isFile()) {
        return {
          success: false,
          error: 'Path is not a file'
        }
      }

      const ext = path.extname(validation.resolvedPath!).toLowerCase()
      if (ext !== '.pdf') {
        return {
          success: false,
          error: 'File is not a PDF'
        }
      }

      // Load pdf-parse
      const parse = await loadPdfParse()

      // Read PDF file
      const dataBuffer = await fs.readFile(validation.resolvedPath!)
      const data = await parse(dataBuffer)

      // Extract text (with length limit)
      const text = data.text.slice(0, maxLength)
      const truncated = data.text.length > maxLength

      return {
        success: true,
        data: {
          text,
          pages: data.numpages,
          info: data.info,
          metadata: data.metadata,
          truncated,
          originalLength: data.text.length,
          summary: `PDF with ${data.numpages} pages, ${data.text.length} characters${truncated ? ' (truncated)' : ''}`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to analyze PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

/**
 * Tool for analyzing DOCX files
 */
export const analyzeDocxTool: Tool = {
  name: 'analyze_docx',
  description: 'Extract text content from a DOCX (Microsoft Word) file',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the DOCX file (relative to current working directory or absolute)'
      },
      maxLength: {
        type: 'number',
        description: 'Maximum length of text to extract (default: 10000 characters)'
      }
    },
    required: ['path']
  },
  requiresConfirmation: false,
  execute: async (params, session) => {
    const { path: filePath, maxLength = 10000 } = params

    // Validate path
    const validation = validatePath(filePath, session)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      }
    }

    try {
      // Check if file exists and is a DOCX
      const stats = await fs.stat(validation.resolvedPath!)
      if (!stats.isFile()) {
        return {
          success: false,
          error: 'Path is not a file'
        }
      }

      const ext = path.extname(validation.resolvedPath!).toLowerCase()
      if (ext !== '.docx') {
        return {
          success: false,
          error: 'File is not a DOCX'
        }
      }

      // Load mammoth
      const mammothLib = await loadMammoth()

      // Extract text from DOCX
      const result = await mammothLib.extractRawText({ path: validation.resolvedPath! })

      // Extract text (with length limit)
      const text = result.value.slice(0, maxLength)
      const truncated = result.value.length > maxLength

      return {
        success: true,
        data: {
          text,
          truncated,
          originalLength: result.value.length,
          messages: result.messages,
          summary: `DOCX with ${result.value.length} characters${truncated ? ' (truncated)' : ''}`
        }
      }
    } catch (error) {
      return {
        success: false,
        error: `Failed to analyze DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
  }
}

/**
 * Tool for analyzing generic documents (auto-detects type)
 */
export const analyzeDocumentTool: Tool = {
  name: 'analyze_document',
  description: 'Analyze a document file (PDF or DOCX) and extract its text content',
  parameters: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Path to the document file (relative to current working directory or absolute)'
      },
      maxLength: {
        type: 'number',
        description: 'Maximum length of text to extract (default: 10000 characters)'
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

    // Detect file type
    const ext = path.extname(validation.resolvedPath!).toLowerCase()

    if (ext === '.pdf') {
      return analyzePdfTool.execute(params, session)
    } else if (ext === '.docx') {
      return analyzeDocxTool.execute(params, session)
    } else {
      return {
        success: false,
        error: `Unsupported file type: ${ext}. Supported: .pdf, .docx`
      }
    }
  }
}
