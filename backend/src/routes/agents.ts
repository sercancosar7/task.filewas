/**
 * Agent Routes
 * ECC agent listing and details API endpoints
 * @module @task-filewas/backend/routes/agents
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
 * Agent frontmatter from markdown file
 */
interface AgentFrontmatter {
  name: string
  description: string
  tools: string[]
  model: 'claude' | 'glm'
  model_override_allowed: boolean
  thinking_level: 'off' | 'think' | 'max'
}

/**
 * Agent summary for list response
 */
interface AgentSummary {
  id: string
  name: string
  description: string
  tools: string[]
  model: 'claude' | 'glm'
  modelOverrideAllowed: boolean
  thinkingLevel: 'off' | 'think' | 'max'
}

/**
 * Agent detail with content
 */
interface AgentDetail extends AgentSummary {
  content: string
  filePath: string
}

// =============================================================================
// Helper Functions
// =============================================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AGENTS_DIR = path.resolve(__dirname, '../../../../.task/agents')

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
 * Parse agent markdown file
 */
async function parseAgentFile(filePath: string): Promise<AgentDetail | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8')
    const { data, content: bodyContent } = parseFrontmatter(content)

    const frontmatter = data as Partial<AgentFrontmatter>

    // Skip README and files without proper frontmatter
    if (!frontmatter.name || path.basename(filePath) === 'README.md') {
      return null
    }

    const id = path.basename(filePath, '.md')

    return {
      id,
      name: frontmatter.name,
      description: frontmatter.description ?? '',
      tools: Array.isArray(frontmatter.tools) ? frontmatter.tools : [],
      model: frontmatter.model ?? 'claude',
      modelOverrideAllowed: frontmatter.model_override_allowed ?? true,
      thinkingLevel: frontmatter.thinking_level ?? 'off',
      content: bodyContent,
      filePath: filePath,
    }
  } catch {
    return null
  }
}

/**
 * List all agent files
 */
async function listAgentFiles(): Promise<string[]> {
  try {
    const files = await fs.readdir(AGENTS_DIR)
    return files
      .filter((file) => file.endsWith('.md') && file !== 'README.md')
      .map((file) => path.join(AGENTS_DIR, file))
  } catch {
    return []
  }
}

// =============================================================================
// Routes
// =============================================================================

/**
 * GET /api/agents
 * List all agents from .task/agents directory
 *
 * Returns: Array of agent summaries
 */
router.get(
  '/',
  authMiddleware,
  asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    // Get all agent files
    const agentFiles = await listAgentFiles()

    if (agentFiles.length === 0) {
      res.json(success([]))
      return
    }

    // Parse all agents
    const agentPromises = agentFiles.map((file) => parseAgentFile(file))
    const agents = await Promise.all(agentPromises)

    // Filter out nulls and convert to summaries
    const validAgents = agents.filter((agent): agent is AgentDetail => agent !== null)

    const summaries: AgentSummary[] = validAgents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      description: agent.description,
      tools: agent.tools,
      model: agent.model,
      modelOverrideAllowed: agent.modelOverrideAllowed,
      thinkingLevel: agent.thinkingLevel,
    }))

    // Sort by name
    summaries.sort((a, b) => a.name.localeCompare(b.name))

    res.json(success(summaries))
  })
)

/**
 * GET /api/agents/:id
 * Get agent details by ID
 *
 * Path Parameters:
 * - id: Agent ID (filename without .md)
 *
 * Returns: Agent with full content
 */
router.get(
  '/:id',
  authMiddleware,
  asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const id = req.params['id'] as string | undefined

    if (!id || typeof id !== 'string') {
      throw ApiError.badRequest('Agent ID is required')
    }

    // Security: prevent directory traversal
    if (id.includes('..') || id.includes('/') || id.includes('\\')) {
      throw ApiError.badRequest('Invalid agent ID')
    }

    const filePath = path.join(AGENTS_DIR, `${id}.md`)

    // Check if file exists
    try {
      await fs.access(filePath)
    } catch {
      throw ApiError.notFound(`Agent not found: ${id}`)
    }

    // Parse agent
    const agent = await parseAgentFile(filePath)

    if (!agent) {
      throw ApiError.notFound(`Agent not found: ${id}`)
    }

    res.json(success(agent))
  })
)

export { router as agentsRouter }
export default router
