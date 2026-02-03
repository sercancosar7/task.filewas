/**
 * API type definitions
 * @module @task-filewas/shared/types/api
 */

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  /** Whether the request was successful */
  success: boolean;
  /** Response data (present if success is true) */
  data?: T;
  /** Error message (present if success is false) */
  error?: string;
  /** Error code for programmatic handling */
  errorCode?: ApiErrorCode;
  /** Additional metadata */
  meta?: ApiMeta;
}

/**
 * API response metadata
 */
export interface ApiMeta {
  /** Total number of items (for lists) */
  total?: number;
  /** Current page number (1-indexed) */
  page?: number;
  /** Items per page */
  limit?: number;
  /** Total pages */
  totalPages?: number;
  /** Request ID for tracing */
  requestId?: string;
  /** Response timestamp */
  timestamp?: string;
  /** Response time in ms */
  responseTime?: number;
}

/**
 * Paginated response with required pagination metadata
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  success: true;
  data: T[];
  meta: PaginationMeta;
}

/**
 * Pagination metadata (required for paginated responses)
 */
export interface PaginationMeta extends ApiMeta {
  /** Total number of items */
  total: number;
  /** Current page number (1-indexed) */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of pages */
  totalPages: number;
  /** Has more pages */
  hasNextPage: boolean;
  /** Has previous pages */
  hasPreviousPage: boolean;
}

// =============================================================================
// API Error Types
// =============================================================================

/**
 * Standard error codes
 */
export type ApiErrorCode =
  // Authentication errors (401)
  | 'UNAUTHORIZED'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN'
  // Authorization errors (403)
  | 'FORBIDDEN'
  | 'INSUFFICIENT_PERMISSIONS'
  // Resource errors (404)
  | 'NOT_FOUND'
  | 'PROJECT_NOT_FOUND'
  | 'SESSION_NOT_FOUND'
  | 'AGENT_NOT_FOUND'
  // Validation errors (400)
  | 'VALIDATION_ERROR'
  | 'INVALID_INPUT'
  | 'MISSING_REQUIRED_FIELD'
  | 'INVALID_FORMAT'
  // Conflict errors (409)
  | 'CONFLICT'
  | 'ALREADY_EXISTS'
  | 'SESSION_ALREADY_RUNNING'
  | 'AGENT_ALREADY_RUNNING'
  // Rate limit errors (429)
  | 'RATE_LIMITED'
  | 'TOO_MANY_REQUESTS'
  // Server errors (500)
  | 'INTERNAL_ERROR'
  | 'DATABASE_ERROR'
  | 'EXTERNAL_SERVICE_ERROR'
  // Service errors (503)
  | 'SERVICE_UNAVAILABLE'
  | 'CLAUDE_CLI_ERROR'
  | 'MODEL_UNAVAILABLE';

/**
 * Detailed API error
 */
export interface ApiError {
  /** Error message */
  message: string;
  /** Error code */
  code: ApiErrorCode;
  /** HTTP status code */
  statusCode: number;
  /** Field-specific errors (for validation) */
  fieldErrors?: FieldError[];
  /** Stack trace (development only) */
  stack?: string;
  /** Request ID for support */
  requestId?: string;
  /** Timestamp */
  timestamp: string;
}

/**
 * Field-specific validation error
 */
export interface FieldError {
  /** Field path (e.g., "user.email" or "items[0].name") */
  field: string;
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
  /** Rejected value (if safe to expose) */
  value?: unknown;
}

/**
 * Error response wrapper
 */
export interface ApiErrorResponse extends ApiResponse<never> {
  success: false;
  error: string;
  errorCode: ApiErrorCode;
  details?: ApiError;
}

// =============================================================================
// API Request Types
// =============================================================================

/**
 * Pagination parameters for list requests
 */
export interface PaginationParams {
  /** Page number (1-indexed, default: 1) */
  page?: number;
  /** Items per page (default: 20, max: 100) */
  limit?: number;
  /** Items to skip (alternative to page) */
  offset?: number;
}

/**
 * Sort parameters for list requests
 */
export interface SortParams<T extends string = string> {
  /** Field to sort by */
  sortBy?: T;
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Combined list request parameters
 */
export interface ListParams<T extends string = string> extends PaginationParams, SortParams<T> {
  /** Search query */
  search?: string;
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  /** Start date (ISO string) */
  from?: string;
  /** End date (ISO string) */
  to?: string;
}

// =============================================================================
// API Endpoint Types
// =============================================================================

/**
 * Health check response
 */
export interface HealthCheckResponse {
  /** Service status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Service version */
  version: string;
  /** Uptime in seconds */
  uptime: number;
  /** Timestamp */
  timestamp: string;
  /** Individual service statuses */
  services?: ServiceStatus[];
}

/**
 * Individual service status
 */
export interface ServiceStatus {
  /** Service name */
  name: string;
  /** Service status */
  status: 'healthy' | 'degraded' | 'unhealthy';
  /** Response time in ms */
  responseTime?: number;
  /** Last check timestamp */
  lastCheck?: string;
  /** Error message if unhealthy */
  error?: string;
}

/**
 * Authentication login request
 */
export interface LoginRequest {
  /** Password */
  password: string;
}

/**
 * Authentication login response
 */
export interface LoginResponse {
  /** JWT token */
  token: string;
  /** Token expiration (ISO string) */
  expiresAt?: string;
}

/**
 * Token verification response
 */
export interface VerifyTokenResponse {
  /** Whether token is valid */
  valid: boolean;
  /** Decoded token payload */
  payload?: {
    /** Issued at timestamp */
    iat: number;
    /** Expiration timestamp */
    exp?: number | undefined;
  } | undefined;
}

// =============================================================================
// Batch Operation Types
// =============================================================================

/**
 * Batch operation request
 */
export interface BatchRequest<T> {
  /** Items to process */
  items: T[];
}

/**
 * Batch operation result
 */
export interface BatchResult<T> {
  /** Successfully processed items */
  succeeded: T[];
  /** Failed items with errors */
  failed: Array<{
    item: T;
    error: string;
    code?: ApiErrorCode;
  }>;
  /** Total processed */
  totalProcessed: number;
  /** Success count */
  successCount: number;
  /** Failure count */
  failureCount: number;
}

/**
 * Batch delete request
 */
export interface BatchDeleteRequest {
  /** IDs to delete */
  ids: string[];
}

/**
 * Batch update request
 */
export interface BatchUpdateRequest<T> {
  /** Items with IDs and update data */
  items: Array<{
    id: string;
    data: Partial<T>;
  }>;
}

// =============================================================================
// Streaming Types
// =============================================================================

/**
 * Server-sent event data
 */
export interface SSEMessage<T = unknown> {
  /** Event type */
  event: string;
  /** Event data */
  data: T;
  /** Event ID */
  id?: string;
  /** Retry interval (ms) */
  retry?: number;
}

/**
 * Stream status
 */
export interface StreamStatus {
  /** Stream is active */
  isActive: boolean;
  /** Messages received */
  messagesReceived: number;
  /** Stream started at */
  startedAt?: string;
  /** Last message at */
  lastMessageAt?: string;
}
