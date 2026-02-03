/**
 * Layout Constants
 * Craft Agents design system layout sabitleri.
 *
 * Bu sabitler CSS variables ile senkronize olmalidir:
 * - globals.css: --panel-window-edge-spacing, --panel-spacing
 * - tailwind.config.ts: zIndex, boxShadow
 */

// =============================================================================
// PANEL SPACING (Craft Agents 3-Panel Layout)
// =============================================================================

/**
 * Window kenarlarindan panel padding (px)
 * CSS: --panel-window-edge-spacing
 */
export const PANEL_WINDOW_EDGE_SPACING = 6

/**
 * Paneller arasi gap (px)
 * CSS: --panel-spacing
 */
export const PANEL_PANEL_SPACING = 5

/**
 * macOS title bar offset (px)
 * Electron/desktop uygulamalarinda title bar icin
 */
export const TITLE_BAR_OFFSET = 50

// =============================================================================
// PANEL SIZES (Min/Max/Default Widths)
// =============================================================================

/**
 * Sol sidebar boyutlari (px)
 */
export const SIDEBAR_WIDTH = {
  MIN: 180,
  DEFAULT: 220,
  MAX: 320,
} as const

/**
 * Session list (Navigator) panel boyutlari (px)
 */
export const NAVIGATOR_WIDTH = {
  MIN: 240,
  DEFAULT: 300,
  MAX: 480,
} as const

/**
 * Sag sidebar overlay threshold (px)
 * Bu genisligin altinda right sidebar overlay olarak acilir
 */
export const RIGHT_SIDEBAR_OVERLAY_THRESHOLD = 600

/**
 * Sag sidebar overlay genisligi (px)
 */
export const RIGHT_SIDEBAR_WIDTH = 300

// =============================================================================
// Z-INDEX SCALE
// =============================================================================

/**
 * Z-index layer hiyerarsisi
 * Tailwind config ile senkronize: tailwind.config.ts -> zIndex
 */
export const Z_INDEX = {
  /** Normal content */
  BASE: 0,
  /** Floating panels */
  PANEL: 50,
  /** Modal dialogs */
  MODAL: 200,
  /** Overlays, backdrops */
  OVERLAY: 300,
  /** Dropdowns, popovers, tooltips */
  FLOATING_MENU: 400,
  /** Loading screens, splash */
  SPLASH: 600,
} as const

// =============================================================================
// SHADOWS
// =============================================================================

/**
 * Box shadow degerleri
 * CSS variables ile senkronize: globals.css -> --shadow-*
 * Tailwind config ile senkronize: tailwind.config.ts -> boxShadow
 */
export const SHADOWS = {
  /** En hafif golge - subtle dividers */
  THIN: '0 1px 2px rgba(0,0,0,0.05)',
  /** Minimal golge - cards, buttons */
  MINIMAL: '0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)',
  /** Orta golge - elevated cards */
  MIDDLE: '0 4px 6px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)',
  /** Guclu golge - modals, dropdowns */
  STRONG: '0 10px 15px rgba(0,0,0,0.1), 0 4px 6px rgba(0,0,0,0.05)',
  /** Kucuk modal golge - toasts, popovers */
  MODAL_SMALL: '0 4px 12px rgba(0,0,0,0.15)',
} as const

// =============================================================================
// BREAKPOINTS (Responsive)
// =============================================================================

/**
 * Tailwind breakpoint degerleri (px)
 * Tailwind varsayilan degerler ile senkronize
 */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const

/**
 * Mobile threshold - bu genisligin altinda mobil layout
 */
export const MOBILE_BREAKPOINT = BREAKPOINTS.MD

// =============================================================================
// ANIMATION DURATIONS (ms)
// =============================================================================

/**
 * Animasyon sureleri (milliseconds)
 */
export const ANIMATION_DURATION = {
  /** Hizli mikro-interaksiyonlar */
  FAST: 150,
  /** Varsayilan animasyonlar */
  DEFAULT: 200,
  /** Orta boyutlu elementler */
  MEDIUM: 300,
  /** Dramatik efektler */
  SLOW: 500,
} as const

// =============================================================================
// UI SIZES
// =============================================================================

/**
 * TurnCard activity section max visible items
 * Bu sayidan fazla item varsa scroll aktif olur
 */
export const MAX_VISIBLE_ACTIVITIES = 14

/**
 * Icon boyutlari (Tailwind class equivalents)
 */
export const ICON_SIZES = {
  /** 12px - tiny icons */
  XS: 'w-3 h-3',
  /** 14px - default inline icons */
  SM: 'w-3.5 h-3.5',
  /** 16px - standard icons */
  DEFAULT: 'w-4 h-4',
  /** 20px - emphasis icons */
  MD: 'w-5 h-5',
  /** 24px - large icons */
  LG: 'w-6 h-6',
} as const

// =============================================================================
// STAGGER DELAYS (Activity Animations)
// =============================================================================

/**
 * Stagger animation delay (seconds)
 */
export const STAGGER_DELAY = {
  /** Hizli listeler icin (30ms) */
  FAST: 0.03,
  /** Varsayilan stagger (50ms) */
  DEFAULT: 0.05,
  /** Yavas/dramatik reveals (100ms) */
  SLOW: 0.1,
} as const

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type ZIndexLevel = keyof typeof Z_INDEX
export type ShadowLevel = keyof typeof SHADOWS
export type BreakpointKey = keyof typeof BREAKPOINTS
export type IconSize = keyof typeof ICON_SIZES
