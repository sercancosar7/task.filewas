/**
 * Skill Routes
 * ECC skill listing and details API endpoints
 * @module @task-filewas/backend/routes/skills
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
 * Skill frontmatter from markdown file
 */
interface SkillFrontmatter {
  name: string
  category: string
  description: string
}

/**
 * Skill summary for list response
 */
interface SkillSummary {
  id: string
  name: string
  category: string
  description: string
}

/**
 * Skill detail with content
 */
interface SkillDetail extends SkillSummary {
  content: string
  filePath: string
}

// =============================================================================
// Helper Functions
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const SKILLS_DIR = path.resolve(__dirname, '../../../../.task/skills')

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
 * Parse skill markdown file
 */
async function parseSkillFile(filePath: string): Promise<SkillDetail | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const { data, content: bodyContent } = parseFrontmatter(content)

    const frontmatter = data as Partial<SkillFrontmatter>

    // Skip README and files without proper frontmatter
    if (!frontmatter.name || path.basename(filePath) === 'README.md') {
      return null
    }

    const id = path.basename(filePath, '.md')

    return {
      id,
      name: frontmatter.name,
      category: frontmatter.category ?? 'general',
      description: frontmatter.description ?? '',
      content: bodyContent,
      filePath: filePath,
    }
  } catch {
    return null
  }
}

/**
 * Recursively list all markdown files in skills directory
 */
async function listSkillFiles(dir: string = SKILLS_DIR): Promise<string[]> {
  const results: string[] = []

  try {
    const items = await fs.readdir(dir, { withFileTypes: true })

    for (const item of items) {
      const fullPath = path.join(dir, item.name)

      if (item.isDirectory()) {
        // Recursively scan subdirectories
        const subFiles = await listSkillFiles(fullPath)
        results.push(...subFiles)
      } else if (item.isFile() && item.name.endsWith('.md') && item.name !== 'README.md') {
        results.push(fullPath)
      }
    }
  } catch {
    // Directory doesn't exist or not readable
  }

  return results
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/skills
 * List all skills from .task/skills directory (recursively)
 *
 * Query Parameters:
 * - category: Filter by category (optional)
 *
 * Returns: Array of skill summaries
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const categoryFilter = req.query['category'] as string | undefined

    // Get all skill files recursively
    const skillFiles = await listSkillFiles()

    if (skillFiles.length === 0) {
      res.json(success([]))
      return
    }

    // Parse all skills
    const skillPromises = skillFiles.map((file) => parseSkillFile(file))
    const skills = await Promise.all(skillPromises)

    // Filter out nulls and convert to summaries
    let validSkills = skills.filter((skill): skill is SkillDetail => skill !== null)

    // Apply category filter if provided
    if (categoryFilter) {
      validSkills = validSkills.filter(
        (skill) => skill.category.toLowerCase() === categoryFilter.toLowerCase()
      )
    }

    const summaries: SkillSummary[] = validSkills.map((skill) => ({
      id: skill.id,
      name: skill.name,
      category: skill.category,
      description: skill.description,
    }))

    // Sort by category then name
    summaries.sort((a, b) => {
      const categoryCompare = a.category.localeCompare(b.category)
      if (categoryCompare !== 0) return categoryCompare
      return a.name.localeCompare(b.name)
    })

    res.json(success(summaries))
  })
)

/**
 * GET /api/skills/:id
 * Get skill details by ID
 *
 * Path Parameters:
 * - id: Skill ID (filename without .md)
 *
 * Returns: Skill with full content
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string | undefined

    if (!id || typeof id !== 'string') {
      throw ApiError.badRequest('Skill ID is required')
    }

    // Security: prevent directory traversal
    if (id.includes('..') || id.includes('/') || id.includes('\\')) {
      throw ApiError.badRequest('Invalid skill ID')
    }

    // Search for the skill in the directory tree
    const skillFiles = await listSkillFiles()
    const matchingFile = skillFiles.find((file) => path.basename(file, '.md') === id)

    if (!matchingFile) {
      throw ApiError.notFound(`Skill not found: ${id}`)
    }

    // Parse skill
    const skill = await parseSkillFile(matchingFile)

    if (!skill) {
      throw ApiError.notFound(`Skill not found: ${id}`)
    }

    res.json(success(skill))
  })
)

/**
 * GET /api/skills/categories
 * List all unique skill categories
 *
 * Returns: Array of category names
 */
router.get(
  '/categories/list',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    // Get all skill files recursively
    const skillFiles = await listSkillFiles()

    if (skillFiles.length === 0) {
      res.json(success([]))
      return
    }

    // Parse all skills to extract categories
    const skillPromises = skillFiles.map((file) => parseSkillFile(file))
    const skills = await Promise.all(skillPromises)

    // Extract unique categories
    const categories = new Set<string>()
    for (const skill of skills) {
      if (skill?.category) {
        categories.add(skill.category)
      }
    }

    const categoryList = Array.from(categories).sort()

    res.json(success(categoryList))
  })
)

export { router as skillsRouter }
export default router
