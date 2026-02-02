/**
 * Async Handler Middleware
 * Wraps async route handlers to catch errors automatically
 * @module @task-filewas/backend/middleware/asyncHandler
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express'

/**
 * Async handler wrapper type
 * Wraps async Express handlers to forward errors to error middleware
 */
export type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>

/**
 * Wrap an async route handler to catch errors
 * Passes caught errors to Express error middleware via next()
 *
 * @example
 * ```typescript
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await userService.findAll()
 *   res.json(success(users))
 * }))
 * ```
 *
 * @param fn - Async request handler function
 * @returns Express request handler that catches async errors
 */
export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}

/**
 * Create an async handler with custom error transform
 * Allows transforming errors before passing to error middleware
 *
 * @param fn - Async request handler function
 * @param errorTransform - Function to transform errors
 * @returns Express request handler
 */
export function asyncHandlerWithTransform(
  fn: AsyncRequestHandler,
  errorTransform?: (error: unknown) => Error
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((error) => {
      const transformedError = errorTransform ? errorTransform(error) : error
      next(transformedError)
    })
  }
}

/**
 * Wrap multiple middleware functions
 * Catches errors from any middleware in the chain
 *
 * @param middlewares - Array of middleware functions
 * @returns Array of wrapped middleware functions
 */
export function wrapMiddlewares(
  middlewares: RequestHandler[]
): RequestHandler[] {
  return middlewares.map((middleware) => {
    // Only wrap if it's an async function
    if (middleware.constructor.name === 'AsyncFunction') {
      return asyncHandler(middleware as unknown as AsyncRequestHandler)
    }
    return middleware
  })
}

export default asyncHandler
