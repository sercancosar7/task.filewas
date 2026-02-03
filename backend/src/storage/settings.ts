/**
 * Settings Storage Service
 * Platform-wide settings management (model, permission, etc.)
 * @module @task-filewas/backend/storage/settings
 */

import { resolveDataPath, readJson, writeJson, type StorageResult } from './json.js'

// =============================================================================
// Types
// =============================================================================

/**
 * Default model selection
 */
export type DefaultModel = 'auto' | 'claude' | 'glm'

/**
 * Default permission mode for operations
 */
export type DefaultPermissionMode = 'safe' | 'ask' | 'auto'

/**
 * Thinking level default
 */
export type DefaultThinkingLevel = 'off' | 'think' | 'max'

/**
 * Platform settings structure
 */
export interface PlatformSettings {
  /** Default model to use (auto = agent decides) */
  defaultModel: DefaultModel
  /** Default permission mode for Claude CLI operations */
  defaultPermission: DefaultPermissionMode
  /** Default thinking level */
  defaultThinking: DefaultThinkingLevel
  /** Enable automatic fallback to other model on failure */
  fallbackEnabled: boolean
  /** Fallback order (priority list) */
  fallbackOrder: Array<'claude' | 'glm'>
  /** Auto-commit after phase completion */
  autoCommit: boolean
  /** Auto-push after commit */
  autoPush: boolean
  /** Auto-start next phase after completion */
  autoNextPhase: boolean
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: PlatformSettings = {
  defaultModel: 'auto',
  defaultPermission: 'ask',
  defaultThinking: 'off',
  fallbackEnabled: true,
  fallbackOrder: ['claude', 'glm'],
  autoCommit: true,
  autoPush: false,
  autoNextPhase: true,
}

// =============================================================================
// File Path
// =============================================================================

/** Path to settings.json file */
const SETTINGS_PATH = resolveDataPath('settings.json')

// =============================================================================
// Settings Operations
// =============================================================================

/**
 * Get all platform settings
 * @returns Platform settings object
 */
export async function getSettings(): Promise<StorageResult<PlatformSettings>> {
  return readJson<PlatformSettings>(SETTINGS_PATH, {
    defaultValue: DEFAULT_SETTINGS,
  })
}

/**
 * Update platform settings
 * @param updates Partial settings to update
 * @returns Updated settings
 */
export async function updateSettings(
  updates: Partial<PlatformSettings>
): Promise<StorageResult<PlatformSettings>> {
  // Read current settings
  const currentResult = await getSettings()

  if (!currentResult.success) {
    return currentResult
  }

  const current = currentResult.data!

  // Merge with updates
  const updated: PlatformSettings = {
    ...current,
    ...updates,
  }

  // Write back to file
  const writeResult = await writeJson<PlatformSettings>(SETTINGS_PATH, updated)

  if (!writeResult.success) {
    return writeResult
  }

  return { success: true, data: updated }
}

/**
 * Reset settings to defaults
 * @returns Default settings
 */
export async function resetSettings(): Promise<StorageResult<PlatformSettings>> {
  const writeResult = await writeJson<PlatformSettings>(SETTINGS_PATH, DEFAULT_SETTINGS)
  if (!writeResult.success) {
    return writeResult
  }
  return { success: true, data: DEFAULT_SETTINGS }
}

/**
 * Get a specific setting value
 * @param key Setting key
 * @returns Setting value or null if not found
 */
export async function getSetting<K extends keyof PlatformSettings>(
  key: K
): Promise<StorageResult<PlatformSettings[K] | null>> {
  const result = await getSettings()

  if (!result.success) {
    return { success: false, error: result.error }
  }

  return { success: true, data: result.data![key] ?? null }
}

/**
 * Set a specific setting value
 * @param key Setting key
 * @param value New value
 * @returns Updated settings
 */
export async function setSetting<K extends keyof PlatformSettings>(
  key: K,
  value: PlatformSettings[K]
): Promise<StorageResult<PlatformSettings>> {
  return updateSettings({ [key]: value } as Partial<PlatformSettings>)
}

export default {
  getSettings,
  updateSettings,
  resetSettings,
  getSetting,
  setSetting,
  DEFAULT_SETTINGS,
}
