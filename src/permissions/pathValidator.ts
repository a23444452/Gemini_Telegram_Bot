import path from 'path';
import fs from 'fs';
import type { UserSession } from '../types/session';

export interface PathValidationResult {
  valid: boolean;
  resolvedPath?: string;
  error?: string;
}

/**
 * List of sensitive file patterns that should never be accessible
 */
const SENSITIVE_PATTERNS = [
  /\.ssh\//,                    // SSH keys and config
  /\.env$/,                     // Environment variables
  /\.env\./,                    // .env.local, .env.production, etc.
  /id_rsa/,                     // SSH private keys
  /id_ed25519/,                 // SSH private keys (ed25519)
  /id_ecdsa/,                   // SSH private keys (ECDSA)
  /\.aws\/credentials/,         // AWS credentials
  /\.aws\/config/,              // AWS config
  /\/etc\/passwd/,              // System password file
  /\/etc\/shadow/,              // System shadow file
  /\.npmrc/,                    // NPM config with tokens
  /\.pypirc/,                   // Python package index config
  /\.netrc/,                    // Network credentials
  /\.dockercfg/,                // Docker credentials
  /\.docker\/config\.json/,     // Docker credentials
  /\.kube\/config/,             // Kubernetes config
  /\.pgpass/,                   // PostgreSQL password file
  /\.my\.cnf/,                  // MySQL credentials
  /private_key/,                // Generic private keys
  /secret/i,                    // Files with 'secret' in name
  /credential/i,                // Files with 'credential' in name
];

/**
 * Check if a path contains sensitive file patterns
 */
function isSensitivePath(resolvedPath: string): boolean {
  return SENSITIVE_PATTERNS.some(pattern => pattern.test(resolvedPath));
}

/**
 * Check if a resolved path is within any of the allowed paths
 */
function isWithinAllowedPaths(resolvedPath: string, allowedPaths: string[]): boolean {
  return allowedPaths.some(allowedPath => {
    const normalizedAllowed = path.normalize(allowedPath);
    const normalizedResolved = path.normalize(resolvedPath);

    // Check if the resolved path starts with the allowed path
    return normalizedResolved === normalizedAllowed ||
           normalizedResolved.startsWith(normalizedAllowed + path.sep);
  });
}

/**
 * Validate a path for security and access control
 *
 * Security checks:
 * 1. Path traversal prevention
 * 2. Symlink resolution and validation
 * 3. Sensitive file blocking
 * 4. Allowed paths enforcement
 *
 * @param inputPath - The path to validate (relative or absolute)
 * @param session - User session containing currentWorkingDir and allowedPaths
 * @returns PathValidationResult with validation status and resolved path or error
 */
export function validatePath(inputPath: string, session: UserSession): PathValidationResult {
  // Check for empty or whitespace-only paths
  if (!inputPath || inputPath.trim().length === 0) {
    return {
      valid: false,
      error: 'Path cannot be empty',
    };
  }

  try {
    // Resolve relative paths against current working directory
    let resolvedPath: string;
    if (path.isAbsolute(inputPath)) {
      resolvedPath = path.normalize(inputPath);
    } else {
      resolvedPath = path.resolve(session.currentWorkingDir, inputPath);
    }

    // Resolve symlinks to get the real path
    // Note: We use realpathSync which will throw if the path doesn't exist
    // For paths that don't exist yet (e.g., mkdir), we accept the normalized path
    try {
      if (fs.existsSync(resolvedPath)) {
        resolvedPath = fs.realpathSync(resolvedPath);
      }
    } catch (symlinkError) {
      // If realpath fails, continue with normalized path
      // This handles cases where symlink points to non-existent location
    }

    // Normalize to handle multiple slashes and other irregularities
    resolvedPath = path.normalize(resolvedPath);

    // Check if path is within allowed paths
    if (!isWithinAllowedPaths(resolvedPath, session.allowedPaths)) {
      return {
        valid: false,
        error: `Access denied: path is outside allowed paths`,
      };
    }

    // Check for sensitive files
    if (isSensitivePath(resolvedPath)) {
      return {
        valid: false,
        error: `Access denied: sensitive file or directory`,
      };
    }

    return {
      valid: true,
      resolvedPath,
    };
  } catch (error) {
    return {
      valid: false,
      error: `Path validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}
