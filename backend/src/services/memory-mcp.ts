/**
 * Memory MCP Service
 * Wrapper for Model Context Protocol Memory Server
 * Provides knowledge graph storage for project decisions, patterns, and notes
 * @module @task-filewas/backend/services/memory-mcp
 */

import { spawn, ChildProcess } from 'node:child_process'

// =============================================================================
// Types
// =============================================================================

/**
 * Memory MCP entity (node in the knowledge graph)
 */
export interface MemoryEntity {
  /** Unique entity name/identifier */
  name: string
  /** Entity type (e.g., 'project', 'decision', 'pattern', 'note') */
  entityType: string
  /** Array of observations/facts about this entity */
  observations: string[]
  /** Optional bundle name (for grouped entities) */
  bundleName?: string
  /** Optional creation date */
  createdAt?: string
}

/**
 * Memory MCP relation between entities
 */
export interface MemoryRelation {
  /** Source entity name */
  from: string
  /** Target entity name */
  to: string
  /** Relation type (e.g., 'implements', 'depends_on', 'related_to') */
  relationType: string
}

/**
 * Memory MCP observation deletion
 */
export interface MemoryObservationDeletion {
  /** Entity name */
  entityName: string
  /** Observations to delete (exact match) */
  observations: string[]
}

/**
 * Memory MCP node from search results
 */
export interface MemoryNode {
  name: string
  entityType: string
  observations: string[]
}

/**
 * Memory MCP service result
 */
export interface MemoryResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

// =============================================================================
// Configuration
// =============================================================================

/**
 * Memory MCP server configuration
 */
const MEMORY_MCP_CONFIG = {
  /** MCP server command */
  command: 'npx',
  /** MCP server args */
  args: ['-y', '@modelcontextprotocol/server-memory'],
  /** Optional: custom storage path (defaults to XDG state dir) */
  storagePath: process.env['MEMORY_STORAGE_PATH'],
  /** Request timeout in milliseconds */
  timeout: 30000,
} as const

// =============================================================================
// Memory MCP Service
// =============================================================================

/**
 * Memory MCP Service Client
 * Communicates with the Memory MCP server via stdio
 *
 * @example
 * ```typescript
 * const memory = new MemoryMcpService()
 *
 * // Create a project entity
 * await memory.createEntity({
 *   name: 'task-filewas-v0.1.0',
 *   entityType: 'project',
 *   observations: ['Otonom AI platform', 'TypeScript monorepo']
 * })
 *
 * // Add observations
 * await memory.addObservations({
 *   entityName: 'task-filewas-v0.1.0',
 *   contents: ['JWT authentication kullaniliyor', 'Radix UI tercih edildi']
 * })
 *
 * // Search for information
 * const results = await memory.searchNodes('task-filewas kararlar')
 * ```
 */
export class MemoryMcpService {
  private process: ChildProcess | null = null
  private requestId = 0
  private pendingRequests = new Map<number, {
    resolve: (value: unknown) => void
    reject: (error: Error) => void
    timeout: NodeJS.Timeout
  }>()

  /**
   * Start the Memory MCP server process
   */
  private async startProcess(): Promise<void> {
    if (this.process && !this.process.killed) {
      return // Already running
    }

    return new Promise((resolve, reject) => {
      const proc = spawn(MEMORY_MCP_CONFIG.command, MEMORY_MCP_CONFIG.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_NO_WARNINGS: '1',
        },
      })

      this.process = proc

      // Handle stdout (responses from MCP server)
      proc.stdout?.on('data', (data) => {
        this.handleResponse(data.toString())
      })

      // Handle stderr (logging/debug info)
      proc.stderr?.on('data', () => {
        // MCP server logs to stderr, ignore for now
        // Could log to debug file if needed
      })

      // Handle process exit
      proc.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.warn(`Memory MCP process exited with code ${code}`)
        }
        // Clear pending requests
        for (const req of this.pendingRequests.values()) {
          clearTimeout(req.timeout)
          req.reject(new Error('Memory MCP process exited'))
        }
        this.pendingRequests.clear()
        this.process = null
      })

      // Handle errors
      proc.on('error', (err) => {
        console.error('Memory MCP process error:', err)
        reject(err)
      })

      // Give process time to start
      setTimeout(() => resolve(), 500)
    })
  }

  /**
   * Handle response from MCP server
   */
  private handleResponse(data: string): void {
    const lines = data.split('\n').filter(Boolean)

    for (const line of lines) {
      try {
        const response = JSON.parse(line)

        // Find matching pending request
        const pending = this.pendingRequests.get(response.id)
        if (!pending) continue

        // Clear timeout
        clearTimeout(pending.timeout)
        this.pendingRequests.delete(response.id)

        // Resolve or reject based on response
        if (response.error) {
          pending.reject(new Error(response.error.message || 'Unknown error'))
        } else {
          pending.resolve(response.result)
        }
      } catch (e) {
        // Not a valid JSON response, ignore
      }
    }
  }

  /**
   * Send a request to the MCP server
   */
  private async sendRequest(method: string, params?: unknown): Promise<unknown> {
    await this.startProcess()

    return new Promise((resolve, reject) => {
      const id = ++this.requestId

      // Set up timeout
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Memory MCP request timeout: ${method}`))
      }, MEMORY_MCP_CONFIG.timeout)

      // Store pending request
      this.pendingRequests.set(id, { resolve, reject, timeout })

      // Send request
      const request = {
        jsonrpc: '2.0',
        id,
        method,
        params: params || {},
      }

      this.process?.stdin?.write(JSON.stringify(request) + '\n')
    })
  }

  // ===========================================================================
  // Entity Operations
  // ===========================================================================

  /**
   * Create a new entity (or multiple) in the knowledge graph
   * @param entities - Single entity or array of entities
   * @returns Success status
   */
  async createEntities(
    entities: MemoryEntity | MemoryEntity[]
  ): Promise<MemoryResult> {
    try {
      const params = Array.isArray(entities)
        ? { entities }
        : { entities: [entities] }

      await this.sendRequest('mcp__memory__create_entities', params)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Create a single entity
   */
  async createEntity(entity: MemoryEntity): Promise<MemoryResult> {
    return this.createEntities(entity)
  }

  /**
   * Add observations to an existing entity
   * @param entityName - Name of the entity
   * @param contents - Array of observation strings to add
   * @returns Success status
   */
  async addObservations(
    entityName: string,
    contents: string | string[]
  ): Promise<MemoryResult> {
    try {
      const params = {
        observations: [
          {
            entityName,
            contents: Array.isArray(contents) ? contents : [contents],
          },
        ],
      }

      await this.sendRequest('mcp__memory__add_observations', params)
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Delete observations from an entity
   * @param deletions - Array of deletion operations
   * @returns Success status
   */
  async deleteObservations(
    deletions: MemoryObservationDeletion[]
  ): Promise<MemoryResult> {
    try {
      await this.sendRequest('mcp__memory__delete_observations', { deletions })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Delete entities from the knowledge graph
   * @param entityNames - Array of entity names to delete
   * @returns Success status
   */
  async deleteEntities(entityNames: string[]): Promise<MemoryResult> {
    try {
      await this.sendRequest('mcp__memory__delete_entities', { entityNames })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // ===========================================================================
  // Relation Operations
  // ===========================================================================

  /**
   * Create relations between entities
   * @param relations - Array of relations to create
   * @returns Success status
   */
  async createRelations(relations: MemoryRelation[]): Promise<MemoryResult> {
    try {
      await this.sendRequest('mcp__memory__create_relations', { relations })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  /**
   * Create a single relation
   */
  async createRelation(from: string, to: string, relationType: string): Promise<MemoryResult> {
    return this.createRelations([{ from, to, relationType }])
  }

  /**
   * Delete relations
   * @param relations - Array of relations to delete
   * @returns Success status
   */
  async deleteRelations(relations: MemoryRelation[]): Promise<MemoryResult> {
    try {
      await this.sendRequest('mcp__memory__delete_relations', { relations })
      return { success: true }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  // ===========================================================================
  // Query Operations
  // ===========================================================================

  /**
   * Search for nodes in the knowledge graph
   * @param query - Search query string
   * @returns Matching nodes
   */
  async searchNodes(query: string): Promise<MemoryResult<MemoryNode[]>> {
    try {
      const result = await this.sendRequest('mcp__memory__search_nodes', { query })
      return { success: true, data: result as MemoryNode[] }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: [],
      }
    }
  }

  /**
   * Open specific nodes by name
   * @param names - Array of entity names to retrieve
   * @returns Retrieved nodes
   */
  async openNodes(names: string[]): Promise<MemoryResult<MemoryNode[]>> {
    try {
      const result = await this.sendRequest('mcp__memory__open_nodes', { names })
      return { success: true, data: result as MemoryNode[] }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: [],
      }
    }
  }

  /**
   * Open a single node by name
   */
  async openNode(name: string): Promise<MemoryResult<MemoryNode | null>> {
    const result = await this.openNodes([name])
    if (!result.success || !result.data || result.data.length === 0) {
      return { success: result.success, data: null, error: result.error ?? 'Not found' }
    }
    return { success: true, data: result.data[0] ?? null }
  }

  /**
   * Read the entire knowledge graph
   * @returns All nodes and relations
   */
  async readGraph(): Promise<MemoryResult<{ nodes: MemoryNode[] }>> {
    try {
      const result = await this.sendRequest('mcp__memory__read_graph', {})
      return { success: true, data: result as { nodes: MemoryNode[] } }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: { nodes: [] },
      }
    }
  }

  // ===========================================================================
  // Project-Specific Helpers
  // ===========================================================================

  /**
   * Create or update a project entity
   * @param projectId - Unique project identifier
   * @param version - Project version (e.g., 'v0.1.0')
   * @param observations - Initial observations
   */
  async createProjectEntity(
    projectId: string,
    version: string,
    observations: string[]
  ): Promise<MemoryResult> {
    const entityName = this.buildProjectEntityName(projectId, version)
    return this.createEntity({
      name: entityName,
      entityType: 'project',
      observations,
      bundleName: projectId,
    })
  }

  /**
   * Add project decision to memory
   * @param projectId - Project identifier
   * @param version - Project version
   * @param decision - Decision description
   */
  async addProjectDecision(
    projectId: string,
    version: string,
    decision: string
  ): Promise<MemoryResult> {
    const entityName = this.buildProjectEntityName(projectId, version)
    return this.addObservations(entityName, `Decision: ${decision}`)
  }

  /**
   * Add project note to memory
   * @param projectId - Project identifier
   * @param version - Project version
   * @param note - Note content
   */
  async addProjectNote(
    projectId: string,
    version: string,
    note: string
  ): Promise<MemoryResult> {
    const entityName = this.buildProjectEntityName(projectId, version)
    return this.addObservations(entityName, `Note: ${note}`)
  }

  /**
   * Add project pattern to memory
   * @param projectId - Project identifier
   * @param version - Project version
   * @param pattern - Pattern description
   */
  async addProjectPattern(
    projectId: string,
    version: string,
    pattern: string
  ): Promise<MemoryResult> {
    const entityName = this.buildProjectEntityName(projectId, version)
    return this.addObservations(entityName, `Pattern: ${pattern}`)
  }

  /**
   * Search project memory
   * @param projectId - Project identifier
   * @param query - Search query
   */
  async searchProjectMemory(
    projectId: string,
    query: string
  ): Promise<MemoryResult<MemoryNode[]>> {
    const enhancedQuery = `${projectId} ${query}`
    return this.searchNodes(enhancedQuery)
  }

  /**
   * Get project entity with all observations
   * @param projectId - Project identifier
   * @param version - Project version
   */
  async getProjectMemory(
    projectId: string,
    version: string
  ): Promise<MemoryResult<MemoryNode | null>> {
    const entityName = this.buildProjectEntityName(projectId, version)
    return this.openNode(entityName)
  }

  /**
   * Build project entity name
   */
  private buildProjectEntityName(projectId: string, version: string): string {
    return `${projectId}-${version}`
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  /**
   * Stop the Memory MCP process
   */
  async stop(): Promise<void> {
    // Clear pending requests
    for (const req of this.pendingRequests.values()) {
      clearTimeout(req.timeout)
      req.reject(new Error('Service stopped'))
    }
    this.pendingRequests.clear()

    // Kill process
    if (this.process && !this.process.killed) {
      this.process.kill('SIGTERM')
      this.process = null
    }
  }

  /**
   * Check if the service is running
   */
  isRunning(): boolean {
    return this.process !== null && !this.process.killed
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let memoryMcpInstance: MemoryMcpService | null = null

/**
 * Get the singleton Memory MCP service instance
 */
export function getMemoryMcpService(): MemoryMcpService {
  if (!memoryMcpInstance) {
    memoryMcpInstance = new MemoryMcpService()
  }
  return memoryMcpInstance
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetMemoryMcpService(): void {
  if (memoryMcpInstance) {
    memoryMcpInstance.stop()
    memoryMcpInstance = null
  }
}

export default MemoryMcpService
