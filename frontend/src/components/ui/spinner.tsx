import * as React from 'react'
import { Loader2 } from 'lucide-react'
import { motion } from 'framer-motion'
import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const spinnerVariants = cva('animate-spin text-foreground/60', {
  variants: {
    size: {
      xs: 'h-3 w-3',
      sm: 'h-4 w-4',
      default: 'h-5 w-5',
      md: 'h-6 w-6',
      lg: 'h-8 w-8',
      xl: 'h-10 w-10',
    },
  },
  defaultVariants: {
    size: 'default',
  },
})

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  /** Show text label next to spinner */
  label?: string
  /** Position of label relative to spinner */
  labelPosition?: 'right' | 'bottom'
}

/**
 * Spinner component for loading states.
 * Uses Lucide Loader2 icon with CSS animation.
 *
 * @example
 * <Spinner />
 * <Spinner size="lg" />
 * <Spinner label="Yukleniyor..." />
 * <Spinner size="sm" label="Islem yapiliyor" labelPosition="bottom" />
 */
const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, label, labelPosition = 'right', ...props }, ref) => {
    const isVertical = labelPosition === 'bottom'

    return (
      <div
        ref={ref}
        className={cn(
          'inline-flex items-center gap-2',
          isVertical && 'flex-col gap-1.5',
          className
        )}
        role="status"
        aria-live="polite"
        aria-busy="true"
        {...props}
      >
        <Loader2 className={cn(spinnerVariants({ size }))} />
        {label && (
          <span
            className={cn(
              'text-foreground/60',
              size === 'xs' && 'text-[10px]',
              size === 'sm' && 'text-[11px]',
              size === 'default' && 'text-[13px]',
              size === 'md' && 'text-sm',
              size === 'lg' && 'text-base',
              size === 'xl' && 'text-lg'
            )}
          >
            {label}
          </span>
        )}
        <span className="sr-only">{label || 'Yukleniyor...'}</span>
      </div>
    )
  }
)
Spinner.displayName = 'Spinner'

/**
 * Animated spinner with Framer Motion.
 * Provides fade-in animation when appearing.
 */
const AnimatedSpinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Spinner className={className} {...props} />
      </motion.div>
    )
  }
)
AnimatedSpinner.displayName = 'AnimatedSpinner'

/**
 * Grid-style spinner with pulsing dots.
 * Alternative to rotating spinner for variety.
 */
interface GridSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'default' | 'lg'
}

const GridSpinner = React.forwardRef<HTMLDivElement, GridSpinnerProps>(
  ({ className, size = 'default', ...props }, ref) => {
    const dotSizes = {
      sm: 'h-1 w-1',
      default: 'h-1.5 w-1.5',
      lg: 'h-2 w-2',
    }

    const gapSizes = {
      sm: 'gap-0.5',
      default: 'gap-1',
      lg: 'gap-1.5',
    }

    return (
      <div
        ref={ref}
        className={cn('grid grid-cols-3', gapSizes[size], className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
        {...props}
      >
        {[...Array(9)].map((_, i) => (
          <motion.div
            key={i}
            className={cn('rounded-full bg-foreground/40', dotSizes[size])}
            animate={{
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              delay: i * 0.1,
            }}
          />
        ))}
        <span className="sr-only">Yukleniyor...</span>
      </div>
    )
  }
)
GridSpinner.displayName = 'GridSpinner'

/**
 * Pulse spinner - simple pulsing circle.
 */
interface PulseSpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'default' | 'lg'
}

const PulseSpinner = React.forwardRef<HTMLDivElement, PulseSpinnerProps>(
  ({ className, size = 'default', ...props }, ref) => {
    const sizes = {
      sm: 'h-3 w-3',
      default: 'h-4 w-4',
      lg: 'h-6 w-6',
    }

    return (
      <div
        ref={ref}
        className={cn('relative', sizes[size], className)}
        role="status"
        aria-live="polite"
        aria-busy="true"
        {...props}
      >
        <motion.div
          className="absolute inset-0 rounded-full bg-accent"
          animate={{
            scale: [1, 1.5, 1],
            opacity: [0.5, 0, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <div className="absolute inset-0 rounded-full bg-accent" />
        <span className="sr-only">Yukleniyor...</span>
      </div>
    )
  }
)
PulseSpinner.displayName = 'PulseSpinner'

export { Spinner, AnimatedSpinner, GridSpinner, PulseSpinner, spinnerVariants }
