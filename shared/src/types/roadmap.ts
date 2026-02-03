/**
 * Roadmap type definitions
 * @module @task-filewas/shared/types/roadmap
 */

import type { PhaseStatus } from './index';

// =============================================================================
// Types
// =============================================================================

/**
 * Phase task status
 */
export type TaskStatus = 'pending' | 'in_progress' | 'done';

/**
 * Phase task from roadmap
 */
export interface PhaseTask {
  /** Task ID (e.g., "97.1") */
  id: string;
  /** Task title */
  title: string;
  /** Task status */
  status: TaskStatus;
  /** Optional task details */
  details?: string;
}

/**
 * Phase from roadmap
 */
export interface Phase {
  /** Phase ID (1-based) */
  id: number;
  /** Phase name */
  name: string;
  /** Phase status */
  status: PhaseStatus;
  /** Phase description */
  description?: string;
  /** Phase tasks */
  tasks?: PhaseTask[];
  /** Phase dependencies (other phase IDs) */
  dependencies?: number[];
  /** Acceptance criteria */
  acceptanceCriteria?: string[];
  /** Technical notes */
  technicalNotes?: string[];
  /** When the phase started */
  startedAt?: string;
  /** When the phase completed */
  completedAt?: string;
  /** Duration in minutes */
  durationMinutes?: number;
}

/**
 * Milestone from roadmap
 */
export interface Milestone {
  /** Milestone ID */
  id: number;
  /** Milestone name */
  name: string;
  /** Milestone phases */
  phases: number[];
  /** Milestone color (hex) */
  color?: string;
  /** Milestone description */
  description?: string;
}

/**
 * Roadmap metadata header
 */
export interface RoadmapHeader {
  /** Type identifier */
  type: 'header';
  /** Project name */
  projectName: string;
  /** Version */
  version: string;
  /** Current phase number */
  currentPhase: number;
  /** Total phases */
  totalPhases: number;
  /** Start date (YYYY-MM-DD) */
  startDate?: string | null;
  /** Project description */
  description?: string;
}

/**
 * Full roadmap data
 */
export interface Roadmap {
  /** Project name */
  projectName: string;
  /** Version */
  version: string;
  /** Current phase number */
  currentPhase: number;
  /** Total phases */
  totalPhases: number;
  /** Start date */
  startDate?: string | null;
  /** Estimated end date */
  estimatedEndDate?: string | null;
  /** Project description */
  description?: string;
  /** Overview file */
  overviewFile?: string;
  /** Changelog file */
  changelogFile?: string;
  /** Memory file */
  memoryFile?: string;
  /** Prerequisites */
  prerequisites?: string[];
  /** Milestones */
  milestones: Milestone[];
  /** Phases */
  phases: Phase[];
}

/**
 * Roadmap progress statistics
 */
export interface RoadmapProgress {
  /** Total phases */
  total: number;
  /** Completed phases */
  completed: number;
  /** In progress phases */
  inProgress: number;
  /** Pending phases */
  pending: number;
  /** Progress percentage (0-100) */
  percentage: number;
}

/**
 * Roadmap filter options
 */
export interface RoadmapFilterOptions {
  /** Filter by status */
  status?: PhaseStatus | PhaseStatus[];
  /** Filter by milestone ID */
  milestoneId?: number;
  /** Search in name and description */
  search?: string;
  /** Limit results */
  limit?: number;
  /** Offset results */
  offset?: number;
}
