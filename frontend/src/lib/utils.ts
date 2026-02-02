import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names using clsx and merges Tailwind classes with tailwind-merge.
 * This utility handles conditional classes and resolves Tailwind conflicts.
 *
 * @example
 * cn('px-2 py-1', 'px-4') // => 'py-1 px-4' (px-4 overwrites px-2)
 * cn('text-red-500', isActive && 'text-blue-500')
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
