/**
 * Toast notification hook
 * @module @task-filewas/frontend/hooks/useToast
 */

import { toast as sonnerToast, type ExternalToast, type ToastT } from 'sonner'

/**
 * Toast notification types
 */
export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

/**
 * Toast options for Sonner
 */
export interface ToastOptions {
  /**
   * Duration in milliseconds before auto-dismiss (default: 5000)
   */
  duration?: number

  /**
   * Action button configuration
   */
  action?: {
    label: string
    onClick: () => void
  }

  /**
   * Custom icon (React element)
   */
  icon?: React.ReactNode

  /**
   * ID for the toast (useful for programmatically closing)
   */
  id?: string | number

  /**
   * Position of the toast
   */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center'

  /**
   * Callback when toast is dismissed
   */
  onDismiss?: () => void

  /**
   * Callback when toast auto closes
   */
  onAutoClose?: (toast: ToastT) => void
}

/**
 * Icons for different toast variants
 */
export const ToastIcons = {
  success: '✓',
  error: '✗',
  info: 'ℹ',
  warning: '⚠',
} as const

/**
 * Toast API returned by useToast hook
 */
export interface ToastAPI {
  /**
   * Show a success toast
   */
  success: (message: string, options?: ToastOptions) => string | number

  /**
   * Show an error toast
   */
  error: (message: string, options?: ToastOptions) => string | number

  /**
   * Show an info toast
   */
  info: (message: string, options?: ToastOptions) => string | number

  /**
   * Show a warning toast
   */
  warning: (message: string, options?: ToastOptions) => string | number

  /**
   * Show a default toast
   */
  default: (message: string, options?: ToastOptions) => string | number

  /**
   * Show a promise toast (loading state)
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: Error) => string)
    }
  ) => void

  /**
   * Dismiss a specific toast or all toasts
   */
  dismiss: (id?: string | number) => void
}

/**
 * Convert ToastOptions to ExternalToast
 */
function toExternalToast(options?: ToastOptions): ExternalToast {
  if (!options) return {}

  const result: ExternalToast = {}

  if (options.duration !== undefined) result.duration = options.duration
  if (options.icon !== undefined) result.icon = options.icon
  if (options.id !== undefined) result.id = options.id
  if (options.position !== undefined) result.position = options.position
  if (options.onDismiss !== undefined) result.onDismiss = options.onDismiss
  if (options.onAutoClose !== undefined) result.onAutoClose = options.onAutoClose

  if (options.action) {
    result.action = {
      label: options.action.label,
      onClick: options.action.onClick,
    }
  }

  return result
}

/**
 * Hook for displaying toast notifications
 *
 * @example
 * ```tsx
 * const toast = useToast()
 *
 * // Simple success toast
 * toast.success('Faz tamamlandı!')
 *
 * // Toast with action
 * toast.error('Hata oluştu', {
 *   action: {
 *     label: 'Tekrar Dene',
 *     onClick: () => retry()
 *   }
 * })
 *
 * // Promise toast
 * toast.promise(apiCall(), {
 *   loading: 'Yükleniyor...',
 *   success: 'Başarılı!',
 *   error: 'Bir hata oluştu'
 * })
 * ```
 */
export function useToast(): ToastAPI {
  const success = (message: string, options?: ToastOptions) => {
    return sonnerToast.success(message, toExternalToast(options))
  }

  const error = (message: string, options?: ToastOptions) => {
    return sonnerToast.error(message, toExternalToast(options))
  }

  const info = (message: string, options?: ToastOptions) => {
    return sonnerToast.info(message, toExternalToast(options))
  }

  const warning = (message: string, options?: ToastOptions) => {
    return sonnerToast.warning(message, toExternalToast(options))
  }

  const promise = <T,>(
    promise: Promise<T>,
    messages: {
      loading: string
      success: string | ((data: T) => string)
      error: string | ((error: Error) => string)
    }
  ) => {
    sonnerToast.promise(promise, messages)
  }

  const dismiss = (id?: string | number) => {
    sonnerToast.dismiss(id)
  }

  return {
    success,
    error,
    info,
    warning,
    default: sonnerToast,
    promise,
    dismiss,
  }
}

/**
 * Convenience function to show toast without using the hook
 * Useful for non-component code (services, utils, etc.)
 *
 * @example
 * ```ts
 * import { toast } from '@/hooks/useToast'
 *
 * // In an API service
 * export async function fetchData() {
 *   try {
 *     const data = await api.get()
 *     toast.success('Veri yüklendi')
 *     return data
 *   } catch (error) {
 *     toast.error('Veri yüklenemedi')
 *     throw error
 *   }
 * }
 * ```
 */
export const toast = useToast()
