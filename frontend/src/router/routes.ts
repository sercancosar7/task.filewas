/**
 * Route Path Constants
 * Tum uygulama route'lari merkezi olarak tanimlanir
 */

export const ROUTES = {
  // Ana sayfalar
  HOME: '/',
  DASHBOARD: '/dashboard',

  // Proje yonetimi
  PROJECTS: '/projects',
  PROJECT_DETAIL: '/projects/:id',
  PROJECT_SESSIONS: '/projects/:id/sessions',
  PROJECT_ROADMAP: '/projects/:id/roadmap',
  PROJECT_FILES: '/projects/:id/files',
  PROJECT_CHANGELOG: '/projects/:id/changelog',
  PROJECT_SETTINGS: '/projects/:id/settings',

  // Session yonetimi
  SESSIONS: '/sessions',
  SESSION_DETAIL: '/sessions/:id',

  // ECC
  AGENTS: '/agents',
  SKILLS: '/skills',
  SOURCES: '/sources',

  // Sistem
  LOGS: '/logs',
  SETTINGS: '/settings',

  // Auth
  LOGIN: '/login',
} as const

// Route helper fonksiyonlari
export function getProjectRoute(projectId: string): string {
  return ROUTES.PROJECT_DETAIL.replace(':id', projectId)
}

export function getProjectSessionsRoute(projectId: string): string {
  return ROUTES.PROJECT_SESSIONS.replace(':id', projectId)
}

export function getProjectRoadmapRoute(projectId: string): string {
  return ROUTES.PROJECT_ROADMAP.replace(':id', projectId)
}

export function getProjectFilesRoute(projectId: string): string {
  return ROUTES.PROJECT_FILES.replace(':id', projectId)
}

export function getProjectChangelogRoute(projectId: string): string {
  return ROUTES.PROJECT_CHANGELOG.replace(':id', projectId)
}

export function getProjectSettingsRoute(projectId: string): string {
  return ROUTES.PROJECT_SETTINGS.replace(':id', projectId)
}

export function getSessionRoute(sessionId: string): string {
  return ROUTES.SESSION_DETAIL.replace(':id', sessionId)
}

// Route type
export type RouteKey = keyof typeof ROUTES
export type RoutePath = (typeof ROUTES)[RouteKey]
