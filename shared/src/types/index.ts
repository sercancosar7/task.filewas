/**
 * Shared type definitions
 * Will be populated with project, session, message types etc.
 */

// Base types
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt?: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

// Pagination types
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Status types
export type SessionStatus =
  | 'todo'
  | 'in-progress'
  | 'needs-review'
  | 'done'
  | 'cancelled';

export type PhaseStatus = 'pending' | 'in_progress' | 'completed';

export type AgentStatus = 'idle' | 'running' | 'paused' | 'error' | 'completed';

export type PermissionMode = 'safe' | 'ask' | 'auto';

export type ThinkingLevel = 'off' | 'think' | 'max';

export type ModelProvider = 'claude' | 'glm';

// Message types
export type MessageRole = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}
