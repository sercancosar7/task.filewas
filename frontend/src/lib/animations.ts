import type { Variants, Transition } from 'framer-motion'

/**
 * Framer Motion animation variants for consistent UI animations.
 * Based on Craft Agents design system.
 */

// =============================================================================
// TRANSITIONS
// =============================================================================

/**
 * Standard transition presets
 */
export const transitions = {
  /** Fast transition for micro-interactions */
  fast: { duration: 0.15, ease: 'easeOut' } as Transition,

  /** Default transition for most animations */
  default: { duration: 0.2, ease: 'easeOut' } as Transition,

  /** Medium transition for larger elements */
  medium: { duration: 0.3, ease: 'easeOut' } as Transition,

  /** Slow transition for dramatic effects */
  slow: { duration: 0.5, ease: 'easeOut' } as Transition,

  /** Spring transition for bouncy effects */
  spring: {
    type: 'spring',
    stiffness: 400,
    damping: 30,
  } as Transition,

  /** Gentle spring for subtle effects */
  gentleSpring: {
    type: 'spring',
    stiffness: 200,
    damping: 25,
  } as Transition,
} as const

// =============================================================================
// FADE VARIANTS
// =============================================================================

/**
 * Simple fade in/out animation
 */
export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

/**
 * Fade in with scale effect
 */
export const fadeInScale: Variants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.95 },
}

/**
 * Fade in with blur effect (for modals, overlays)
 */
export const fadeInBlur: Variants = {
  initial: { opacity: 0, filter: 'blur(4px)' },
  animate: { opacity: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, filter: 'blur(4px)' },
}

// =============================================================================
// SLIDE VARIANTS
// =============================================================================

/**
 * Slide in from different directions
 */
export const slideIn = {
  /** Slide in from left */
  left: {
    initial: { x: -20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: -20, opacity: 0 },
  } as Variants,

  /** Slide in from right */
  right: {
    initial: { x: 20, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: 20, opacity: 0 },
  } as Variants,

  /** Slide in from top */
  top: {
    initial: { y: -20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: -20, opacity: 0 },
  } as Variants,

  /** Slide in from bottom */
  bottom: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: 20, opacity: 0 },
  } as Variants,
}

/**
 * Slide in with larger offset (for panels, sidebars)
 */
export const slideInPanel = {
  left: {
    initial: { x: '-100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 0 },
  } as Variants,

  right: {
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '100%', opacity: 0 },
  } as Variants,
}

// =============================================================================
// STAGGER VARIANTS
// =============================================================================

/**
 * Container variant for staggered children animations.
 * Use this on parent element with staggerChildren.
 *
 * @example
 * <motion.ul variants={staggerContainer}>
 *   <motion.li variants={staggerItem}>Item 1</motion.li>
 *   <motion.li variants={staggerItem}>Item 2</motion.li>
 * </motion.ul>
 */
export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.03,
      staggerDirection: -1,
    },
  },
}

/**
 * Fast stagger for quick lists (30ms delay)
 */
export const staggerContainerFast: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.03,
      delayChildren: 0.05,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1,
    },
  },
}

/**
 * Slow stagger for dramatic reveals (100ms delay)
 */
export const staggerContainerSlow: Variants = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

/**
 * Child item for staggered animations
 */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

/**
 * Stagger item with scale
 */
export const staggerItemScale: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
}

// =============================================================================
// COLLAPSE / EXPAND VARIANTS
// =============================================================================

/**
 * Collapse animation for accordion-like components.
 * Animates height from 0 to auto.
 *
 * @example
 * <motion.div
 *   variants={collapse}
 *   initial="collapsed"
 *   animate={isOpen ? "expanded" : "collapsed"}
 * >
 *   Content
 * </motion.div>
 */
export const collapse: Variants = {
  collapsed: {
    height: 0,
    opacity: 0,
    overflow: 'hidden',
    transition: {
      height: { duration: 0.2 },
      opacity: { duration: 0.15 },
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    overflow: 'hidden',
    transition: {
      height: { duration: 0.2 },
      opacity: { duration: 0.2, delay: 0.05 },
    },
  },
}

/**
 * Horizontal collapse (for sidebars)
 */
export const collapseHorizontal: Variants = {
  collapsed: {
    width: 0,
    opacity: 0,
    overflow: 'hidden',
    transition: {
      width: { duration: 0.2 },
      opacity: { duration: 0.15 },
    },
  },
  expanded: {
    width: 'auto',
    opacity: 1,
    overflow: 'hidden',
    transition: {
      width: { duration: 0.2 },
      opacity: { duration: 0.2, delay: 0.05 },
    },
  },
}

// =============================================================================
// SPECIAL EFFECTS
// =============================================================================

/**
 * Shimmer effect for loading states
 */
export const shimmer: Variants = {
  initial: { backgroundPosition: '-200% 0' },
  animate: {
    backgroundPosition: '200% 0',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear',
    },
  },
}

/**
 * Pulse animation for attention
 */
export const pulse: Variants = {
  initial: { scale: 1 },
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.5,
      repeat: Infinity,
      repeatDelay: 1,
    },
  },
}

/**
 * Shake animation for errors
 */
export const shake: Variants = {
  initial: { x: 0 },
  animate: {
    x: [0, -10, 10, -10, 10, 0],
    transition: { duration: 0.4 },
  },
}

/**
 * Bounce animation for success/attention
 */
export const bounce: Variants = {
  initial: { y: 0 },
  animate: {
    y: [0, -8, 0],
    transition: {
      duration: 0.3,
      times: [0, 0.5, 1],
    },
  },
}

/**
 * Rotate animation (for icons, spinners)
 */
export const rotate: Variants = {
  initial: { rotate: 0 },
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
}

/**
 * Rotate 90 degrees (for chevrons)
 */
export const rotateChevron: Variants = {
  collapsed: { rotate: 0 },
  expanded: { rotate: 90 },
}

/**
 * Rotate 180 degrees (for flip icons)
 */
export const rotateFlip: Variants = {
  initial: { rotate: 0 },
  flipped: { rotate: 180 },
}

// =============================================================================
// COMPONENT-SPECIFIC VARIANTS
// =============================================================================

/**
 * Modal/Dialog animation
 */
export const modal: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: {
      duration: 0.15,
    },
  },
}

/**
 * Overlay/backdrop animation
 */
export const overlay: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

/**
 * Tooltip animation
 */
export const tooltip: Variants = {
  initial: { opacity: 0, scale: 0.95, y: -4 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.15 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -4,
    transition: { duration: 0.1 },
  },
}

/**
 * Dropdown menu animation
 */
export const dropdown: Variants = {
  initial: {
    opacity: 0,
    scale: 0.95,
    y: -4,
  },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.15,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: -4,
    transition: {
      duration: 0.1,
    },
  },
}

/**
 * Card hover animation
 */
export const cardHover: Variants = {
  initial: { y: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' },
  hover: {
    y: -2,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    transition: { duration: 0.2 },
  },
}

/**
 * List item animation (for session cards, nav items)
 */
export const listItem: Variants = {
  initial: { opacity: 0, x: -10 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 10 },
  hover: { backgroundColor: 'rgba(255,255,255,0.05)' },
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Creates a stagger delay based on index.
 * @param index - Item index in list
 * @param baseDelay - Base delay in seconds (default: 0.03)
 */
export function getStaggerDelay(index: number, baseDelay = 0.03): number {
  return index * baseDelay
}

/**
 * Creates animation props for a staggered item.
 * @param index - Item index
 * @param baseDelay - Delay per item
 */
export function staggeredItem(index: number, baseDelay = 0.03) {
  return {
    initial: { opacity: 0, y: 10 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { delay: getStaggerDelay(index, baseDelay) },
    },
    exit: { opacity: 0, y: -10 },
  }
}
