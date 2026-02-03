/**
 * useTaskEvents - Hook for handling task-related WebSocket events
 * @module @task-filewas/frontend/hooks/useTaskEvents
 *
 * Listens for task events from WebSocket and updates the task store
 */

import { useEffect } from 'react'
import { toast } from 'sonner'
import { useTaskStore } from '@/stores/tasks'
import type { WSEvents } from '@task-filewas/shared'
import { isServerEvent } from '@task-filewas/shared'

export interface UseTaskEventsOptions {
  /** Whether to show toast notifications on task completion */
  showNotifications?: boolean
}

/**
 * useTaskEvents - Hook for handling task WebSocket events
 *
 * Automatically listens to WebSocket events and updates the task store.
 * Shows toast notifications when tasks complete (if enabled).
 *
 * @example
 * ```tsx
 * function App() {
 *   useTaskEvents({ showNotifications: true })
 *   // ...
 * }
 * ```
 */
export function useTaskEvents(options: UseTaskEventsOptions = {}) {
  const { showNotifications = true } = options
  const {
    addTask,
    updateProgress,
    completeTask,
    errorTask,
    cancelTask,
  } = useTaskStore()

  useEffect(() => {
    // Listen for custom WebSocket events dispatched to window
    const handleWebSocketMessage = (event: MessageEvent) => {
      try {
        const wsMessage: WSEvents = JSON.parse(event.data)

        if (!isServerEvent(wsMessage)) return

        switch (wsMessage.type) {
          case 'task:started':
            addTask(wsMessage)
            break

          case 'task:progress':
            updateProgress(wsMessage)
            break

          case 'task:completed':
            completeTask(wsMessage)
            // Show toast notification if enabled
            if (showNotifications && wsMessage.data.success) {
              toast.success(wsMessage.data.title, {
                description: 'Görev başarıyla tamamlandı',
              })
            } else if (showNotifications && !wsMessage.data.success) {
              toast.error(wsMessage.data.title, {
                description: 'Görev hata ile tamamlandı',
              })
            }
            break

          case 'task:error':
            errorTask(wsMessage)
            if (showNotifications) {
              toast.error(wsMessage.data.title, {
                description: wsMessage.data.error,
              })
            }
            break

          case 'task:cancelled':
            cancelTask(wsMessage)
            if (showNotifications) {
              toast.warning(wsMessage.data.title, {
                description: 'Görev iptal edildi',
              })
            }
            break
        }
      } catch {
        // Ignore non-JSON messages
      }
    }

    // Add event listener for WebSocket messages
    window.addEventListener('message', handleWebSocketMessage)

    return () => {
      window.removeEventListener('message', handleWebSocketMessage)
    }
  }, [addTask, updateProgress, completeTask, errorTask, cancelTask, showNotifications])
}

/**
 * Hook wrapper for use with Socket.IO or other WebSocket libraries
 * that dispatch events to the window object.
 *
 * @example
 * ```tsx
 * function App() {
 *   const socket = useSocket()
 *   useTaskEventsWithSocket(socket)
 * }
 * ```
 */
export function useTaskEventsWithSocket(
  socket: any,
  options: UseTaskEventsOptions = {}
) {
  const { showNotifications = true } = options
  const {
    addTask,
    updateProgress,
    completeTask,
    errorTask,
    cancelTask,
  } = useTaskStore()

  useEffect(() => {
    if (!socket) return

    const handleTaskStarted = (data: any) => {
      const event = { type: 'task:started' as const, data, timestamp: new Date().toISOString() }
      addTask(event as any)
    }

    const handleTaskProgress = (data: any) => {
      const event = { type: 'task:progress' as const, data, timestamp: new Date().toISOString() }
      updateProgress(event as any)
    }

    const handleTaskCompleted = (data: any) => {
      const event = { type: 'task:completed' as const, data, timestamp: new Date().toISOString() }
      completeTask(event as any)
      if (showNotifications && data.success) {
        toast.success(data.title, {
          description: 'Görev başarıyla tamamlandı',
        })
      }
    }

    const handleTaskError = (data: any) => {
      const event = { type: 'task:error' as const, data, timestamp: new Date().toISOString() }
      errorTask(event as any)
      if (showNotifications) {
        toast.error(data.title, {
          description: data.error,
        })
      }
    }

    const handleTaskCancelled = (data: any) => {
      const event = { type: 'task:cancelled' as const, data, timestamp: new Date().toISOString() }
      cancelTask(event as any)
    }

    socket.on('task:started', handleTaskStarted)
    socket.on('task:progress', handleTaskProgress)
    socket.on('task:completed', handleTaskCompleted)
    socket.on('task:error', handleTaskError)
    socket.on('task:cancelled', handleTaskCancelled)

    return () => {
      socket.off('task:started', handleTaskStarted)
      socket.off('task:progress', handleTaskProgress)
      socket.off('task:completed', handleTaskCompleted)
      socket.off('task:error', handleTaskError)
      socket.off('task:cancelled', handleTaskCancelled)
    }
  }, [socket, addTask, updateProgress, completeTask, errorTask, cancelTask, showNotifications])
}

export default useTaskEvents
