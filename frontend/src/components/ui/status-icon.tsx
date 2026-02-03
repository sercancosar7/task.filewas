import * as React from 'react'
import {
  Circle,
  CircleDot,
  CircleDashed,
  CheckCircle2,
  XCircle,
  Flag,
} from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

/**
 * Session Status Types (Craft Agents style)
 *
 * Status mapping:
 * - backlog: Circle (empty) - muted
 * - todo: Circle (empty) - secondary
 * - in-progress: CircleDot (filled center) - accent
 * - needs-review: CircleDashed - info/amber
 * - done: CheckCircle2 - success
 * - cancelled: XCircle - muted
 * - flagged: Flag - info (special filter)
 */
export type SessionStatus =
  | 'backlog'
  | 'todo'
  | 'in-progress'
  | 'needs-review'
  | 'done'
  | 'cancelled'
  | 'flagged'

/**
 * Status color mapping based on Craft Agents design
 */
export const STATUS_CONFIG: Record<
  SessionStatus,
  {
    icon: typeof Circle
    color: string
    label: string
  }
> = {
  backlog: {
    icon: Circle,
    color: 'text-foreground/40',
    label: 'Backlog',
  },
  todo: {
    icon: Circle,
    color: 'text-foreground/60',
    label: 'Todo',
  },
  'in-progress': {
    icon: CircleDot,
    color: 'text-accent',
    label: 'In Progress',
  },
  'needs-review': {
    icon: CircleDashed,
    color: 'text-info',
    label: 'Needs Review',
  },
  done: {
    icon: CheckCircle2,
    color: 'text-success',
    label: 'Done',
  },
  cancelled: {
    icon: XCircle,
    color: 'text-foreground/40',
    label: 'Cancelled',
  },
  flagged: {
    icon: Flag,
    color: 'text-info',
    label: 'Flagged',
  },
}

const statusIconVariants = cva('shrink-0', {
  variants: {
    size: {
      xs: 'h-3 w-3',
      sm: 'h-3.5 w-3.5',
      default: 'h-4 w-4',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

export interface StatusIconProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusIconVariants> {
  /** Session status to display */
  status: SessionStatus
  /** Override the default color */
  colorOverride?: string
  /** Show tooltip with status label */
  showTooltip?: boolean
}

/**
 * StatusIcon component - displays session status as an icon
 *
 * @example
 * <StatusIcon status="todo" />
 * <StatusIcon status="in-progress" size="lg" />
 * <StatusIcon status="done" showTooltip />
 */
const StatusIcon = React.forwardRef<HTMLSpanElement, StatusIconProps>(
  (
    { className, status, size, colorOverride, showTooltip, ...props },
    ref
  ) => {
    const config = STATUS_CONFIG[status]
    const Icon = config.icon
    const colorClass = colorOverride || config.color

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center',
          className
        )}
        title={showTooltip ? config.label : undefined}
        aria-label={config.label}
        {...props}
      >
        <Icon className={cn(statusIconVariants({ size }), colorClass)} />
      </span>
    )
  }
)
StatusIcon.displayName = 'StatusIcon'

/**
 * Helper function to get status config
 */
export function getStatusConfig(status: SessionStatus) {
  return STATUS_CONFIG[status]
}

/**
 * Helper function to get all available statuses
 */
export function getAllStatuses(): SessionStatus[] {
  return Object.keys(STATUS_CONFIG) as SessionStatus[]
}

/**
 * Helper function to check if a string is a valid status
 */
export function isValidStatus(value: string): value is SessionStatus {
  return value in STATUS_CONFIG
}

export { StatusIcon, statusIconVariants }
