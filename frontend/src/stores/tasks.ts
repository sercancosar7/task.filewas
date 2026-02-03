/**
 * Task Store - Background task state management
 * @module @task-filewas/frontend/stores/tasks
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  TaskStartedEvent,
  TaskProgressEvent,
  TaskCompletedEvent,
  TaskErrorEvent,
  TaskCancelledEvent,
} from '@task-filewas/shared'

/**
 * Background task status
 */
export type TaskStatus = 'pending' | 'running' | 'completed' | 'error' | 'cancelled'

/**
 * Background task type
 */
export type TaskType = 'build' | 'test' | 'deploy' | 'git' | 'file' | 'custom'

/**
 * Background task
 */
export interface BackgroundTask {
  /** Unique task ID */
  id: string
  /** Task type */
  type: TaskType
  /** Task title */
  title: string
  /** Optional description */
  description: string | undefined
  /** Task status */
  status: TaskStatus
  /** Progress percentage (0-100) */
  progress: number
  /** Current step/status text */
  currentStep: string | undefined
  /** Error message if status is error */
  error: string | undefined
  /** Start timestamp */
  startedAt: string
  /** End timestamp (completed, error, cancelled) */
  endedAt: string | undefined
  /** Duration in milliseconds */
  duration: number | undefined
  /** Associated project ID */
  projectId: string | undefined
  /** Associated session ID */
  sessionId: string | undefined
  /** Task output (if completed) */
  output: string | undefined
  /** Whether to show notification on complete */
  notifyOnComplete: boolean | undefined
}

/**
 * Task store state
 */
export interface TaskStoreState {
  /** All background tasks */
  tasks: BackgroundTask[]
  /** Active tasks (running or pending) */
  activeTasks: BackgroundTask[]
  /** Completed tasks (kept for history) */
  completedTasks: BackgroundTask[]
}

/**
 * Task store actions
 */
export interface TaskStoreActions {
  // Add/update task from event
  addTask: (event: TaskStartedEvent) => void
  updateProgress: (event: TaskProgressEvent) => void
  completeTask: (event: TaskCompletedEvent) => void
  errorTask: (event: TaskErrorEvent) => void
  cancelTask: (event: TaskCancelledEvent) => void

  // Manual operations
  removeTask: (taskId: string) => void
  clearCompleted: () => void
  clearAll: () => void

  // Get task by ID
  getTaskById: (taskId: string) => BackgroundTask | undefined
}

/**
 * Initial state
 */
const initialState: TaskStoreState = {
  tasks: [],
  activeTasks: [],
  completedTasks: [],
}

/**
 * Create a task from started event
 */
function taskFromStartedEvent(event: TaskStartedEvent): BackgroundTask {
  return {
    id: event.data.taskId,
    type: event.data.taskType,
    title: event.data.title,
    description: event.data.description ?? undefined,
    status: 'running',
    progress: 0,
    currentStep: undefined,
    error: undefined,
    startedAt: new Date().toISOString(),
    endedAt: undefined,
    duration: undefined,
    projectId: event.data.projectId ?? undefined,
    sessionId: event.sessionId ?? undefined,
    output: undefined,
    notifyOnComplete: true,
  }
}

/**
 * Derive computed states
 */
function deriveActiveTasks(tasks: BackgroundTask[]): BackgroundTask[] {
  return tasks.filter((t) => t.status === 'running' || t.status === 'pending')
}

function deriveCompletedTasks(tasks: BackgroundTask[]): BackgroundTask[] {
  return tasks.filter((t) => ['completed', 'error', 'cancelled'].includes(t.status))
}

/**
 * Task Store with persist middleware
 * Only keeps last 50 completed tasks to avoid storage bloat
 */
export const useTaskStore = create<TaskStoreState & TaskStoreActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      addTask: (event: TaskStartedEvent) => {
        const newTask = taskFromStartedEvent(event)
        set((state) => {
          const updatedTasks = [...state.tasks, newTask]
          return {
            tasks: updatedTasks,
            activeTasks: deriveActiveTasks(updatedTasks),
            completedTasks: deriveCompletedTasks(updatedTasks),
          }
        })
      },

      updateProgress: (event: TaskProgressEvent) => {
        set((state) => {
          const updatedTasks = state.tasks.map((t) =>
            t.id === event.data.taskId
              ? {
                  ...t,
                  progress: event.data.progress,
                  currentStep: event.data.statusText,
                }
              : t
          )
          return {
            tasks: updatedTasks,
            activeTasks: deriveActiveTasks(updatedTasks),
            completedTasks: deriveCompletedTasks(updatedTasks),
          }
        })
      },

      completeTask: (event: TaskCompletedEvent) => {
        set((state) => {
          const now = new Date().toISOString()
          const task = state.tasks.find((t) => t.id === event.data.taskId)
          const startedAt = task?.startedAt || now
          const duration = new Date(now).getTime() - new Date(startedAt).getTime()

          const newStatus: TaskStatus = event.data.success ? 'completed' : 'error'

          const updatedTasks = state.tasks.map((t) =>
            t.id === event.data.taskId
              ? {
                  ...t,
                  status: newStatus,
                  progress: 100,
                  endedAt: now,
                  duration: duration,
                  output: event.data.output ?? undefined,
                  error: event.data.success ? undefined : event.data.output ?? 'Task completed with errors',
                }
              : t
          )
          return {
            tasks: updatedTasks,
            activeTasks: deriveActiveTasks(updatedTasks),
            completedTasks: deriveCompletedTasks(updatedTasks),
          }
        })
      },

      errorTask: (event: TaskErrorEvent) => {
        set((state) => {
          const now = new Date().toISOString()
          const task = state.tasks.find((t) => t.id === event.data.taskId)
          const startedAt = task?.startedAt || now
          const duration = new Date(now).getTime() - new Date(startedAt).getTime()
          const newStatus: TaskStatus = event.data.willRetry ? 'running' : 'error'

          const updatedTasks = state.tasks.map((t) =>
            t.id === event.data.taskId
              ? {
                  ...t,
                  status: newStatus,
                  error: event.data.error,
                  endedAt: event.data.willRetry ? undefined : now,
                  duration: event.data.willRetry ? undefined : duration,
                }
              : t
          )
          return {
            tasks: updatedTasks,
            activeTasks: deriveActiveTasks(updatedTasks),
            completedTasks: deriveCompletedTasks(updatedTasks),
          }
        })
      },

      cancelTask: (event: TaskCancelledEvent) => {
        set((state) => {
          const now = new Date().toISOString()
          const task = state.tasks.find((t) => t.id === event.data.taskId)
          const startedAt = task?.startedAt || now
          const duration = new Date(now).getTime() - new Date(startedAt).getTime()
          const newStatus: TaskStatus = 'cancelled'

          const updatedTasks = state.tasks.map((t) =>
            t.id === event.data.taskId
              ? {
                  ...t,
                  status: newStatus,
                  endedAt: now,
                  duration: duration,
                }
              : t
          )
          return {
            tasks: updatedTasks,
            activeTasks: deriveActiveTasks(updatedTasks),
            completedTasks: deriveCompletedTasks(updatedTasks),
          }
        })
      },

      removeTask: (taskId: string) => {
        set((state) => {
          const updatedTasks = state.tasks.filter((t) => t.id !== taskId)
          return {
            tasks: updatedTasks,
            activeTasks: deriveActiveTasks(updatedTasks),
            completedTasks: deriveCompletedTasks(updatedTasks),
          }
        })
      },

      clearCompleted: () => {
        set((state) => {
          const updatedTasks = state.tasks.filter(
            (t) => t.status === 'running' || t.status === 'pending'
          )
          return {
            tasks: updatedTasks,
            activeTasks: deriveActiveTasks(updatedTasks),
            completedTasks: deriveCompletedTasks(updatedTasks),
          }
        })
      },

      clearAll: () => {
        set({
          tasks: [],
          activeTasks: [],
          completedTasks: [],
        })
      },

      getTaskById: (taskId: string) => {
        return get().tasks.find((t) => t.id === taskId)
      },
    }),
    {
      name: 'task-filewas-tasks',
      storage: createJSONStorage(() => localStorage),
      // Only persist completed tasks (limit to last 50)
      partialize: (state) => ({
        tasks: state.tasks.slice(-50),
      }),
    }
  )
)

/**
 * Selector hooks for better performance
 */
export const useTasks = () => useTaskStore((state) => state.tasks)
export const useActiveTasks = () => useTaskStore((state) => state.activeTasks)
export const useCompletedTasks = () => useTaskStore((state) => state.completedTasks)
export const useTaskCount = () => useTaskStore((state) => state.activeTasks.length)

/**
 * Get task by ID hook
 */
export function useTask(taskId: string): BackgroundTask | undefined {
  return useTaskStore((state) => state.tasks.find((t) => t.id === taskId))
}
