import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * Badge variants based on Craft Agents design
 *
 * Styling reference:
 * - Default: bg-foreground/5, text-foreground/60
 * - Success: bg-success/10, text-success
 * - Destructive: bg-destructive/10, text-destructive
 * - Info: bg-info/10, text-info
 * - Accent: bg-accent/10, text-accent
 * - Outline: border, transparent bg
 * - Secondary: bg-foreground/7, text-foreground/80
 *
 * Size reference (Craft Agents):
 * - h-[18px] px-1.5 text-[10px] font-medium rounded
 */
const badgeVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-foreground/5 text-foreground/60',
        success: 'bg-success-10 text-success',
        destructive: 'bg-destructive-10 text-destructive',
        info: 'bg-info-10 text-info',
        accent: 'bg-accent-10 text-accent',
        outline: 'border border-foreground/10 bg-transparent text-foreground/60',
        secondary: 'bg-foreground/7 text-foreground/80',
        muted: 'bg-foreground/5 text-foreground/40',
      },
      size: {
        xs: 'h-4 px-1 text-[9px] rounded-sm',
        sm: 'h-[18px] px-1.5 text-[10px] rounded',
        default: 'h-5 px-2 text-[11px] rounded',
        md: 'h-6 px-2.5 text-xs rounded-md',
        lg: 'h-7 px-3 text-sm rounded-md',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'sm',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  /** Custom background color (overrides variant) */
  bgColor?: string
  /** Custom text color (overrides variant) */
  textColor?: string
  /** Left icon/element */
  leftIcon?: React.ReactNode
  /** Right icon/element */
  rightIcon?: React.ReactNode
  /** Max width with truncate */
  maxWidth?: number | string
}

/**
 * Badge component - displays labels, tags, and status indicators
 *
 * @example
 * // Basic usage
 * <Badge>Default</Badge>
 * <Badge variant="success">Success</Badge>
 * <Badge variant="destructive">Error</Badge>
 *
 * // With icons
 * <Badge leftIcon={<Flag className="h-2.5 w-2.5" />}>Flagged</Badge>
 *
 * // Session status badges
 * <Badge variant="info" size="sm">Needs Review</Badge>
 * <Badge variant="accent" size="sm">In Progress</Badge>
 *
 * // Permission mode badges (Craft Agents style)
 * <Badge variant="accent" leftIcon={<Search />}>Safe</Badge>
 * <Badge variant="info" leftIcon={<HelpCircle />}>Ask</Badge>
 * <Badge variant="success" leftIcon={<Unlock />}>Auto</Badge>
 */
const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      className,
      variant,
      size,
      bgColor,
      textColor,
      leftIcon,
      rightIcon,
      maxWidth,
      children,
      style,
      ...props
    },
    ref
  ) => {
    const customStyle: React.CSSProperties = {
      ...style,
      ...(bgColor && { backgroundColor: bgColor }),
      ...(textColor && { color: textColor }),
      ...(maxWidth && { maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth }),
    }

    return (
      <span
        ref={ref}
        className={cn(
          badgeVariants({ variant, size }),
          leftIcon && 'gap-1',
          rightIcon && 'gap-1',
          maxWidth && 'truncate',
          className
        )}
        style={Object.keys(customStyle).length > 0 ? customStyle : undefined}
        {...props}
      >
        {leftIcon && (
          <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {rightIcon && (
          <span className="shrink-0">{rightIcon}</span>
        )}
      </span>
    )
  }
)
Badge.displayName = 'Badge'

/**
 * StatusBadge - Pre-configured badge for session statuses
 */
export interface StatusBadgeProps extends Omit<BadgeProps, 'variant'> {
  status: 'backlog' | 'todo' | 'in-progress' | 'needs-review' | 'done' | 'cancelled'
}

const STATUS_BADGE_CONFIG: Record<StatusBadgeProps['status'], { variant: BadgeProps['variant']; label: string }> = {
  backlog: { variant: 'muted', label: 'Backlog' },
  todo: { variant: 'secondary', label: 'Todo' },
  'in-progress': { variant: 'accent', label: 'In Progress' },
  'needs-review': { variant: 'info', label: 'Needs Review' },
  done: { variant: 'success', label: 'Done' },
  cancelled: { variant: 'muted', label: 'Cancelled' },
}

const StatusBadge = React.forwardRef<HTMLSpanElement, StatusBadgeProps>(
  ({ status, children, ...props }, ref) => {
    const config = STATUS_BADGE_CONFIG[status]
    return (
      <Badge ref={ref} variant={config.variant} {...props}>
        {children || config.label}
      </Badge>
    )
  }
)
StatusBadge.displayName = 'StatusBadge'

/**
 * PermissionBadge - Pre-configured badge for permission modes
 */
export interface PermissionBadgeProps extends Omit<BadgeProps, 'variant'> {
  mode: 'safe' | 'ask' | 'auto'
}

const PERMISSION_BADGE_CONFIG: Record<
  PermissionBadgeProps['mode'],
  { variant: BadgeProps['variant']; label: string; emoji: string }
> = {
  safe: { variant: 'accent', label: 'Safe', emoji: '🔍' },
  ask: { variant: 'info', label: 'Ask', emoji: '❓' },
  auto: { variant: 'success', label: 'Auto', emoji: '🔓' },
}

const PermissionBadge = React.forwardRef<HTMLSpanElement, PermissionBadgeProps>(
  ({ mode, children, ...props }, ref) => {
    const config = PERMISSION_BADGE_CONFIG[mode]
    return (
      <Badge ref={ref} variant={config.variant} {...props}>
        <span className="mr-0.5">{config.emoji}</span>
        {children || config.label}
      </Badge>
    )
  }
)
PermissionBadge.displayName = 'PermissionBadge'

/**
 * CountBadge - Badge showing a count (e.g., unread messages)
 */
export interface CountBadgeProps extends Omit<BadgeProps, 'children'> {
  count: number
  max?: number
}

const CountBadge = React.forwardRef<HTMLSpanElement, CountBadgeProps>(
  ({ count, max = 99, ...props }, ref) => {
    const displayCount = count > max ? `${max}+` : count.toString()
    return (
      <Badge ref={ref} variant="accent" {...props}>
        {displayCount}
      </Badge>
    )
  }
)
CountBadge.displayName = 'CountBadge'

export { Badge, badgeVariants, StatusBadge, PermissionBadge, CountBadge }
