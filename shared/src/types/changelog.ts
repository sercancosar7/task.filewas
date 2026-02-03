/**
 * Changelog type definitions
 * @module @task-filewas/shared/types/changelog
 */

/**
 * Changelog entry from JSONL file
 * Represents a single changelog record for a phase
 */
export interface ChangelogFileEntry {
  /** Phase number this changelog belongs to */
  phase: number;
  /** Date when the entry was created (YYYY-MM-DD format) */
  date: string;
  /** Title of the changelog entry */
  title: string;
  /** List of changes made in this phase */
  changes: string[];
  /** List of files modified in this phase */
  files: string[];
}

/**
 * Changelog entry for API responses
 * Same as file entry but may include additional computed fields
 */
export interface ChangelogEntry extends ChangelogFileEntry {
  /** Unique identifier */
  id: string;
  /** Creation timestamp (ISO string) */
  createdAt?: string;
}

/**
 * Filter options for changelog queries
 */
export interface ChangelogFilterOptions {
  /** Filter by phase number */
  phase?: number | undefined;
  /** Filter by date range (YYYY-MM-DD format) */
  dateFrom?: string | undefined;
  dateTo?: string | undefined;
  /** Search in title and changes */
  search?: string | undefined;
  /** Maximum number of results */
  limit?: number | undefined;
  /** Skip first N results */
  offset?: number | undefined;
}
