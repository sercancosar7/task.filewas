/**
 * @task-filewas/shared
 *
 * Shared types, schemas and utilities for Task.filewas platform
 */

// Re-export zod for consistent usage across packages
export { z } from 'zod';
export type { ZodSchema, ZodType, ZodError } from 'zod';

// Placeholder exports - will be populated in later phases
// Types
export * from './types';

// Schemas
export * from './schemas';

// Utils
export * from './utils';
