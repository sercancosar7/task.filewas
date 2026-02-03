/**
 * Chat components barrel export
 * @module @task-filewas/frontend/components/chat
 */

export { ChatDisplay } from './ChatDisplay'
export type { ChatDisplayProps } from './ChatDisplay'

export { ChatHeader } from './ChatHeader'
export type { ChatHeaderProps, ChatHeaderAction } from './ChatHeader'

export { MessageList } from './MessageList'
export type { MessageListProps } from './MessageList'

export { UserMessage } from './UserMessage'
export type { UserMessageProps } from './UserMessage'

export { TurnCard } from './TurnCard'
export type { TurnCardProps } from './TurnCard'

export { ActivitySection } from './ActivitySection'
export type { ActivitySectionProps } from './ActivitySection'

export { MarkdownRenderer } from './MarkdownRenderer'
export type { MarkdownRendererProps } from './MarkdownRenderer'

export { CodeBlock } from './CodeBlock'
export type { CodeBlockProps } from './CodeBlock'

export { AgentStatusCard } from './AgentStatusCard'
export type { AgentStatusCardProps } from './AgentStatusCard'

export { ProgressBar, Spinner } from './ProgressBar'
export type { ProgressBarProps, SpinnerProps } from './ProgressBar'

export { WorkflowDiagram } from './WorkflowDiagram'
export type { WorkflowDiagramProps } from './WorkflowDiagram'
export { calculateWorkflowProgress, getWorkflowStatusText } from './WorkflowDiagram'
