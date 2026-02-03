/**
 * Command Routes
 * ECC slash command listing and details API endpoints
 * @module @task-filewas/backend/routes/commands
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { authMiddleware } from '../middleware/auth.js'
import { ApiError, asyncHandler } from '../middleware/index.js'
import { success } from '../utils/apiResponse.js'

const router: RouterType = Router()

// =============================================================================
// Types
// =============================================================================

/**
 * Command frontmatter from markdown file
 */
interface CommandFrontmatter {
  name: string
  description: string
  aliases?: string[]
  category?: string
}

/**
 * Command summary for list response
 */
interface CommandSummary {
  id: string
  name: string
  description: string
  aliases: string[]
  category: string
}

/**
 * Command detail with content
 */
interface CommandDetail extends CommandSummary {
  content: string
  filePath: string
}

// =============================================================================
// Helper Functions
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const COMMANDS_DIR = path.resolve(__dirname, '../../../../.task/commands')

/**
 * Simple YAML frontmatter parser
 * Parses YAML frontmatter between --- delimiters
 */
function parseFrontmatter(content: string): { data: Record<string, unknown>; content: string } {
  const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
  const match = content.match(frontmatterRegex)

  if (!match) {
    return { data: {}, content: content.trim() }
  }

  const yamlContent = match[1] ?? ''
  const bodyContent = match[2] ?? ''

  // Simple YAML parser for key: value pairs
  const data: Record<string, unknown> = {}
  const lines = yamlContent.split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const colonIndex = trimmed.indexOf(':')
    if (colonIndex === -1) continue

    const key = trimmed.substring(0, colonIndex).trim()
    let value: unknown = trimmed.substring(colonIndex + 1).trim()

    // Parse arrays
    if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
      const arrayContent = value.slice(1, -1)
      value = arrayContent.split(',').map((item) => item.trim().replace(/^["']|["']$/g, ''))
    }
    // Parse booleans
    else if (value === 'true') {
      value = true
    } else if (value === 'false') {
      value = false
    }
    // Remove quotes from strings
    else if (typeof value === 'string' && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1)
    }

    data[key] = value
  }

  return { data, content: bodyContent.trim() }
}

/**
 * Parse command markdown file
 */
async function parseCommandFile(filePath: string): Promise<CommandDetail | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const { data, content: bodyContent } = parseFrontmatter(content)

    const frontmatter = data as Partial<CommandFrontmatter>

    // Skip README and files without proper frontmatter
    if (!frontmatter.name || path.basename(filePath) === 'README.md') {
      return null
    }

    const id = path.basename(filePath, '.md')

    return {
      id,
      name: frontmatter.name,
      description: frontmatter.description ?? '',
      aliases: Array.isArray(frontmatter.aliases) ? frontmatter.aliases : [],
      category: frontmatter.category ?? 'general',
      content: bodyContent,
      filePath: filePath,
    }
  } catch {
    return null
  }
}

/**
 * List all command files
 */
async function listCommandFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(COMMANDS_DIR)
    return files
      .filter((file) => file.endsWith('.md') && file !== 'README.md')
      .map((file) => path.join(COMMANDS_DIR, file))
  } catch {
    return []
  }
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/commands
 * List all commands from .task/commands directory
 *
 * Query Parameters:
 * - category: Filter by category (optional)
 *
 * Returns: Array of command summaries
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const categoryFilter = req.query['category'] as string | undefined

    // Get all command files
    const commandFiles = await listCommandFiles()

    if (commandFiles.length === 0) {
      res.json(success([]))
      return
    }

    // Parse all commands
    const commandPromises = commandFiles.map((file) => parseCommandFile(file))
    const commands = await Promise.all(commandPromises)

    // Filter out nulls and convert to summaries
    let validCommands = commands.filter((command): command is CommandDetail => command !== null)

    // Apply category filter if provided
    if (categoryFilter) {
      validCommands = validCommands.filter(
        (command) => command.category.toLowerCase() === categoryFilter.toLowerCase()
      )
    }

    const summaries: CommandSummary[] = validCommands.map((command) => ({
      id: command.id,
      name: command.name,
      description: command.description,
      aliases: command.aliases,
      category: command.category,
    }))

    // Sort by name
    summaries.sort((a, b) => a.name.localeCompare(b.name))

    res.json(success(summaries))
  })
)

/**
 * GET /api/commands/:id
 * Get command details by ID or alias
 *
 * Path Parameters:
 * - id: Command ID (filename without .md) or alias
 *
 * Returns: Command with full content
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string | undefined

    if (!id || typeof id !== 'string') {
      throw ApiError.badRequest('Command ID is required')
    }

    // Security: prevent directory traversal
    if (id.includes('..') || id.includes('/') || id.includes('\\')) {
      throw ApiError.badRequest('Invalid command ID')
    }

    // First try direct file match
    const directPath = path.join(COMMANDS_DIR, `${id}.md`)

    try {
      await fs.access(directPath)
      const command = await parseCommandFile(directPath)
      if (command) {
        res.json(success(command))
        return
      }
    } catch {
      // File doesn't exist, try alias search
    }

    // Search by alias
    const commandFiles = await listCommandFiles()
    for (const file of commandFiles) {
      const command = await parseCommandFile(file)
      if (command && command.aliases.includes(`/${id}`)) {
        res.json(success(command))
        return
      }
    }

    throw ApiError.notFound(`Command not found: ${id}`)
  })
)

/**
 * GET /api/commands/categories/list
 * List all unique command categories
 *
 * Returns: Array of category names
 */
router.get(
  '/categories/list',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    // Get all command files
    const commandFiles = await listCommandFiles()

    if (commandFiles.length === 0) {
      res.json(success([]))
      return
    }

    // Parse all commands to extract categories
    const commandPromises = commandFiles.map((file) => parseCommandFile(file))
    const commands = await Promise.all(commandPromises)

    // Extract unique categories
    const categories = new Set<string>()
    for (const command of commands) {
      if (command?.category) {
        categories.add(command.category)
      }
    }

    const categoryList = Array.from(categories).sort()

    res.json(success(categoryList))
  })
)

export { router as commandsRouter }
export default router
