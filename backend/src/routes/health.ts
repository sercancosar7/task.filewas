/**
 * Health Check Route
 * Provides system health and status information
 * @module @task-filewas/backend/routes/health
 */

import { Router, type Request, type Response, type Router as RouterType } from 'express'
import { env } from '../config/env.js'
import { success } from '../utils/apiResponse.js'
import type { HealthCheckResponse, ServiceStatus } from '@task-filewas/shared'

const router: RouterType = Router()

// Server start time for uptime calculation
const startTime = Date.now()

/**
 * GET /api/health
 * Returns basic health status and server information
 */
router.get('/', (_req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000)

  const healthData: HealthCheckResponse = {
    status: 'healthy',
    version: '0.1.0',
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
  }

  res.json(success(healthData))
})

/**
 * GET /api/health/detailed
 * Returns detailed health status including service checks
 */
router.get('/detailed', async (_req: Request, res: Response) => {
  const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000)

  // Check individual services
  const services: ServiceStatus[] = []

  // Check data directory accessibility
  const dataPathStatus = await checkDataPath()
  services.push(dataPathStatus)

  // Determine overall status
  const hasUnhealthy = services.some(s => s.status === 'unhealthy')
  const hasDegraded = services.some(s => s.status === 'degraded')

  let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
  if (hasUnhealthy) {
    overallStatus = 'unhealthy'
  } else if (hasDegraded) {
    overallStatus = 'degraded'
  }

  const healthData: HealthCheckResponse = {
    status: overallStatus,
    version: '0.1.0',
    uptime: uptimeSeconds,
    timestamp: new Date().toISOString(),
    services,
  }

  // Set appropriate status code
  const statusCode = overallStatus === 'healthy' ? 200 :
                     overallStatus === 'degraded' ? 200 : 503

  res.status(statusCode).json(success(healthData))
})

/**
 * Check data path accessibility
 */
async function checkDataPath(): Promise<ServiceStatus> {
  const startCheck = Date.now()

  try {
    const { access, constants } = await import('node:fs/promises')
    await access(env.DATA_PATH, constants.R_OK | constants.W_OK)

    return {
      name: 'data-storage',
      status: 'healthy',
      responseTime: Date.now() - startCheck,
      lastCheck: new Date().toISOString(),
    }
  } catch (error) {
    return {
      name: 'data-storage',
      status: 'unhealthy',
      responseTime: Date.now() - startCheck,
      lastCheck: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Data path not accessible',
    }
  }
}

export { router as healthRouter }
export default router
