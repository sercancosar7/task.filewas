/**
 * Memory MCP Route
 * API endpoints for memory/knowledge graph operations
 * @module @task-filewas/backend/routes/memory
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express'
import { getMemoryMcpService } from '../services/memory-mcp.js'
import { success, error } from '../utils/apiResponse.js'

const router: RouterType = Router()

/**
 * Helper to get string param
 */
function getStringParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0] ?? ''
  }
  return value ?? ''
}

/**
 * GET /api/memory/search
 * Search for nodes in the knowledge graph
 */
router.get('/search', async (req: Request, res: Response): Promise<void> => {
  const { q } = req.query

  if (!q || typeof q !== 'string') {
    res.status(400).json(error('Search query "q" is required'))
    return
  }

  try {
    const memory = getMemoryMcpService()
    const result = await memory.searchNodes(q)

    if (!result.success) {
      res.status(500).json(error(result.error ?? 'Search failed'))
      return
    }

    res.json(success(result.data ?? []))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json(error(message))
  }
})

/**
 * GET /api/memory/nodes/:name
 * Get a specific node by name
 */
router.get('/nodes/:name', async (req: Request, res: Response): Promise<void> => {
  const { name } = req.params
  const nodeName = getStringParam(name)

  try {
    const memory = getMemoryMcpService()
    const result = await memory.openNode(nodeName)

    if (!result.success) {
      res.status(500).json(error(result.error ?? 'Failed to get node'))
      return
    }

    if (!result.data) {
      res.status(404).json(error('Node not found'))
      return
    }

    res.json(success(result.data))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json(error(message))
  }
})

/**
 * GET /api/memory/project/:projectId/:version
 * Get project memory
 */
router.get('/project/:projectId/:version', async (req: Request, res: Response): Promise<void> => {
  const { projectId, version } = req.params
  const pid = getStringParam(projectId)
  const ver = getStringParam(version)

  try {
    const memory = getMemoryMcpService()
    const result = await memory.getProjectMemory(pid, ver)

    if (!result.success) {
      res.status(500).json(error(result.error ?? 'Failed to get project memory'))
      return
    }

    if (!result.data) {
      // Return empty result if not found
      res.json(success({
        name: `${pid}-${ver}`,
        entityType: 'project',
        observations: [],
      }))
      return
    }

    res.json(success(result.data))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json(error(message))
  }
})

/**
 * POST /api/memory/entity
 * Create a new entity
 */
router.post('/entity', async (req: Request, res: Response): Promise<void> => {
  const { name, entityType, observations, bundleName } = req.body

  if (!name || !entityType) {
    res.status(400).json(error('name and entityType are required'))
    return
  }

  if (!Array.isArray(observations)) {
    res.status(400).json(error('observations must be an array'))
    return
  }

  try {
    const memory = getMemoryMcpService()
    const result = await memory.createEntity({
      name,
      entityType,
      observations: observations ?? [],
      bundleName,
    })

    if (!result.success) {
      res.status(500).json(error(result.error ?? 'Failed to create entity'))
      return
    }

    res.json(success({ created: true, name }))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json(error(message))
  }
})

/**
 * POST /api/memory/project
 * Create or update a project entity
 */
router.post('/project', async (req: Request, res: Response): Promise<void> => {
  const { projectId, version, observations } = req.body

  if (!projectId || !version) {
    res.status(400).json(error('projectId and version are required'))
    return
  }

  if (!Array.isArray(observations)) {
    res.status(400).json(error('observations must be an array'))
    return
  }

  try {
    const memory = getMemoryMcpService()
    const result = await memory.createProjectEntity(
      projectId,
      version,
      observations
    )

    if (!result.success) {
      res.status(500).json(error(result.error ?? 'Failed to create project entity'))
      return
    }

    res.json(success({
      created: true,
      name: `${projectId}-${version}`,
    }))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json(error(message))
  }
})

/**
 * POST /api/memory/observations
 * Add observations to an entity
 */
router.post('/observations', async (req: Request, res: Response): Promise<void> => {
  const { entityName, contents } = req.body

  if (!entityName || !contents) {
    res.status(400).json(error('entityName and contents are required'))
    return
  }

  const contentsArray = Array.isArray(contents) ? contents : [contents]

  try {
    const memory = getMemoryMcpService()
    const result = await memory.addObservations(entityName, contentsArray)

    if (!result.success) {
      res.status(500).json(error(result.error ?? 'Failed to add observations'))
      return
    }

    res.json(success({ added: true, count: contentsArray.length }))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json(error(message))
  }
})

/**
 * POST /api/memory/decision
 * Add a project decision
 */
router.post('/decision', async (req: Request, res: Response): Promise<void> => {
  const { projectId, version, decision } = req.body

  if (!projectId || !version || !decision) {
    res.status(400).json(error('projectId, version, and decision are required'))
    return
  }

  try {
    const memory = getMemoryMcpService()
    const result = await memory.addProjectDecision(projectId, version, decision)

    if (!result.success) {
      res.status(500).json(error(result.error ?? 'Failed to add decision'))
      return
    }

    res.json(success({ added: true }))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json(error(message))
  }
})

/**
 * POST /api/memory/note
 * Add a project note
 */
router.post('/note', async (req: Request, res: Response): Promise<void> => {
  const { projectId, version, note } = req.body

  if (!projectId || !version || !note) {
    res.status(400).json(error('projectId, version, and note are required'))
    return
  }

  try {
    const memory = getMemoryMcpService()
    const result = await memory.addProjectNote(projectId, version, note)

    if (!result.success) {
      res.status(500).json(error(result.error ?? 'Failed to add note'))
      return
    }

    res.json(success({ added: true }))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json(error(message))
  }
})

/**
 * POST /api/memory/pattern
 * Add a project pattern
 */
router.post('/pattern', async (req: Request, res: Response): Promise<void> => {
  const { projectId, version, pattern } = req.body

  if (!projectId || !version || !pattern) {
    res.status(400).json(error('projectId, version, and pattern are required'))
    return
  }

  try {
    const memory = getMemoryMcpService()
    const result = await memory.addProjectPattern(projectId, version, pattern)

    if (!result.success) {
      res.status(500).json(error(result.error ?? 'Failed to add pattern'))
      return
    }

    res.json(success({ added: true }))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json(error(message))
  }
})

/**
 * GET /api/memory/graph
 * Read the entire knowledge graph
 */
router.get('/graph', async (_req: Request, res: Response): Promise<void> => {
  try {
    const memory = getMemoryMcpService()
    const result = await memory.readGraph()

    if (!result.success) {
      res.status(500).json(error(result.error ?? 'Failed to read graph'))
      return
    }

    res.json(success(result.data ?? { nodes: [] }))
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    res.status(500).json(error(message))
  }
})

export { router as memoryRouter }
export default router
