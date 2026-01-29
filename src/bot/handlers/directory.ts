import type { CommandContext, Context } from 'grammy';
import fs from 'fs/promises';
import path from 'path';
import { validatePath } from '../../permissions/pathValidator';
import { SessionManager } from '../middleware/session';

/**
 * Get file type emoji and name
 */
function getFileInfo(name: string, isDirectory: boolean): { emoji: string; name: string } {
  if (isDirectory) {
    return { emoji: '📁', name: name + '/' };
  }
  return { emoji: '📄', name };
}

/**
 * Format directory listing for display
 */
async function formatDirectoryListing(dirPath: string): Promise<string> {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    if (entries.length === 0) {
      return '(empty directory)';
    }

    // Separate directories and files, then sort each alphabetically
    const directories = entries
      .filter(entry => entry.isDirectory())
      .map(entry => entry.name)
      .sort();

    const files = entries
      .filter(entry => !entry.isDirectory())
      .map(entry => entry.name)
      .sort();

    // Format with emojis
    const formattedDirs = directories.map(name => `📁 ${name}/`);
    const formattedFiles = files.map(name => `📄 ${name}`);

    return [...formattedDirs, ...formattedFiles].join('\n');
  } catch (error) {
    throw new Error(`Failed to read directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Handle /pwd command - show current working directory
 */
export async function handlePwd(ctx: CommandContext<Context>) {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply('❌ Error: Unable to identify user');
    return;
  }

  const session = SessionManager.getInstance().getSession(userId);
  await ctx.reply(`📁 Current directory:\n${session.currentWorkingDir}`);
}

/**
 * Handle /ls [path] command - list directory contents
 */
export async function handleLs(ctx: CommandContext<Context>) {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply('❌ Error: Unable to identify user');
    return;
  }

  const session = SessionManager.getInstance().getSession(userId);

  // Parse optional path argument
  const args = ctx.match?.toString().trim() || '';
  const targetPath = args || session.currentWorkingDir;

  // Resolve relative paths
  const absolutePath = path.isAbsolute(targetPath)
    ? targetPath
    : path.join(session.currentWorkingDir, targetPath);

  // Validate path
  const validation = validatePath(absolutePath, session);
  if (!validation.valid) {
    await ctx.reply(`❌ Error: ${validation.error}`);
    return;
  }

  try {
    // Check if path exists and is a directory
    const stats = await fs.stat(validation.resolvedPath!);
    if (!stats.isDirectory()) {
      await ctx.reply(`❌ Error: Not a directory: ${targetPath}`);
      return;
    }

    // List directory contents
    const listing = await formatDirectoryListing(validation.resolvedPath!);
    const displayPath = args ? `${targetPath}` : '(current directory)';

    await ctx.reply(`📂 ${displayPath}:\n\n${listing}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await ctx.reply(`❌ Error: Directory not found: ${targetPath}`);
    } else if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      await ctx.reply(`❌ Error: Permission denied: ${targetPath}`);
    } else {
      await ctx.reply(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Handle /cd <path> command - change working directory
 */
export async function handleCd(ctx: CommandContext<Context>) {
  const userId = ctx.from?.id;
  if (!userId) {
    await ctx.reply('❌ Error: Unable to identify user');
    return;
  }

  const session = SessionManager.getInstance().getSession(userId);
  const sessionManager = SessionManager.getInstance();

  // Parse required path argument
  const args = ctx.match?.toString().trim() || '';
  if (!args) {
    await ctx.reply('❌ Error: Path argument required\n\nUsage: /cd <path>');
    return;
  }

  // Resolve relative paths
  const absolutePath = path.isAbsolute(args)
    ? args
    : path.join(session.currentWorkingDir, args);

  // Validate path
  const validation = validatePath(absolutePath, session);
  if (!validation.valid) {
    await ctx.reply(`❌ Error: ${validation.error}`);
    return;
  }

  try {
    // Check if path exists and is a directory
    const stats = await fs.stat(validation.resolvedPath!);
    if (!stats.isDirectory()) {
      await ctx.reply(`❌ Error: Not a directory: ${args}`);
      return;
    }

    // Update session with new working directory
    sessionManager.updateSession(userId, {
      currentWorkingDir: validation.resolvedPath!,
    });

    await ctx.reply(`✅ Changed directory to:\n${validation.resolvedPath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      await ctx.reply(`❌ Error: Directory not found: ${args}`);
    } else if ((error as NodeJS.ErrnoException).code === 'EACCES') {
      await ctx.reply(`❌ Error: Permission denied: ${args}`);
    } else {
      await ctx.reply(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
