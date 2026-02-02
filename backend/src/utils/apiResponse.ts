/**
 * API Response Helpers
 * Standardized response formatting utilities
 * @module @task-filewas/backend/utils/apiResponse
 */

import type {
  ApiResponse,
  ApiMeta,
  PaginatedResponse,
  PaginationMeta,
  ApiErrorCode,
  ApiErrorResponse,
} from '@task-filewas/shared'

/**
 * Create a successful API response
 * @param data - Response data
 * @param meta - Optional metadata
 * @returns Formatted API response
 */
export function success<T>(data: T, meta?: ApiMeta): ApiResponse<T> {
  const response: ApiResponse<T> = {
    success: true,
    data,
  }

  if (meta) {
    response.meta = meta
  }

  return response
}

/**
 * Create an error API response
 * @param message - Error message
 * @param errorCode - Error code for programmatic handling
 * @returns Formatted error response
 */
export function error(
  message: string,
  errorCode: ApiErrorCode = 'INTERNAL_ERROR'
): ApiErrorResponse {
  return {
    success: false,
    error: message,
    errorCode,
  }
}

/**
 * Create a paginated API response
 * @param data - Array of items
 * @param pagination - Pagination parameters
 * @returns Formatted paginated response
 */
export function paginated<T>(
  data: T[],
  pagination: {
    total: number
    page: number
    limit: number
  }
): PaginatedResponse<T> {
  const { total, page, limit } = pagination
  const totalPages = Math.ceil(total / limit)

  const meta: PaginationMeta = {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  }

  return {
    success: true,
    data,
    meta,
  }
}

/**
 * Create a response with timestamp metadata
 * @param data - Response data
 * @param requestId - Optional request ID for tracing
 * @returns Formatted response with timestamp
 */
export function withTimestamp<T>(
  data: T,
  requestId?: string
): ApiResponse<T> {
  const meta: ApiMeta = {
    timestamp: new Date().toISOString(),
  }

  if (requestId) {
    meta.requestId = requestId
  }

  return {
    success: true,
    data,
    meta,
  }
}

/**
 * Create a created (201) response
 * @param data - Created resource data
 * @returns Formatted API response for created resources
 */
export function created<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
  }
}

/**
 * Create a no content (204) response helper
 * @returns Empty success response
 */
export function noContent(): { success: true } {
  return {
    success: true,
  }
}

/**
 * Calculate pagination metadata from query parameters
 * @param query - Query parameters object
 * @param defaultLimit - Default items per page
 * @param maxLimit - Maximum items per page
 * @returns Pagination parameters
 */
export function parsePaginationParams(
  query: Record<string, unknown>,
  defaultLimit: number = 20,
  maxLimit: number = 100
): { page: number; limit: number; offset: number } {
  const pageParam = query['page']
  const limitParam = query['limit']
  const offsetParam = query['offset']

  // Parse page (1-indexed)
  let page = 1
  if (typeof pageParam === 'string') {
    const parsed = parseInt(pageParam, 10)
    if (!isNaN(parsed) && parsed > 0) {
      page = parsed
    }
  }

  // Parse limit
  let limit = defaultLimit
  if (typeof limitParam === 'string') {
    const parsed = parseInt(limitParam, 10)
    if (!isNaN(parsed) && parsed > 0) {
      limit = Math.min(parsed, maxLimit)
    }
  }

  // Parse offset (overrides page if provided)
  let offset = (page - 1) * limit
  if (typeof offsetParam === 'string') {
    const parsed = parseInt(offsetParam, 10)
    if (!isNaN(parsed) && parsed >= 0) {
      offset = parsed
      // Recalculate page from offset
      page = Math.floor(offset / limit) + 1
    }
  }

  return { page, limit, offset }
}

export default {
  success,
  error,
  paginated,
  withTimestamp,
  created,
  noContent,
  parsePaginationParams,
}
