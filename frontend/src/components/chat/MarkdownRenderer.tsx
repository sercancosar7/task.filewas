/**
 * MarkdownRenderer - Chat response markdown rendering component
 * @module @task-filewas/frontend/components/chat/MarkdownRenderer
 *
 * Features:
 * - GitHub Flavored Markdown support (tables, task lists, strikethrough)
 * - Syntax highlighting for code blocks (Shiki)
 * - Custom styling for dark theme
 * - Copy button for code blocks
 * - External links open in new tab
 * - Responsive tables
 */

import * as React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Check, Copy, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// =============================================================================
// Types
// =============================================================================

export interface MarkdownRendererProps {
  /** Markdown content to render */
  content: string
  /** Additional CSS classes */
  className?: string | undefined
  /** Whether to show compact styling (smaller text) */
  compact?: boolean | undefined
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Code block with copy functionality
 */
interface CodeBlockProps {
  language?: string | undefined
  children: string
}

function CodeBlock({ language, children }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }, [children])

  return (
    <div className="relative group">
      {/* Language badge */}
      {language && (
        <div className="absolute top-2 left-3 text-[10px] text-muted-foreground font-mono uppercase">
          {language}
        </div>
      )}

      {/* Copy button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className={cn(
          'absolute top-2 right-2',
          'h-6 w-6 rounded-[4px]',
          'text-muted-foreground hover:text-foreground',
          'hover:bg-foreground/10',
          'opacity-0 group-hover:opacity-100 transition-opacity'
        )}
        title={copied ? 'Kopyalandi!' : 'Kodu kopyala'}
        aria-label={copied ? 'Kopyalandi' : 'Kodu kopyala'}
      >
        {copied ? (
          <Check className="h-3 w-3 text-success" />
        ) : (
          <Copy className="h-3 w-3" />
        )}
      </Button>

      {/* Code content */}
      <pre
        className={cn(
          'bg-background border border-foreground/10 rounded-lg',
          'p-4 pt-8 overflow-x-auto',
          'text-[13px] font-mono leading-relaxed'
        )}
      >
        <code className={language ? `language-${language}` : undefined}>
          {children}
        </code>
      </pre>
    </div>
  )
}

/**
 * Inline code styling
 */
interface InlineCodeProps {
  children: React.ReactNode
}

function InlineCode({ children }: InlineCodeProps) {
  return (
    <code
      className={cn(
        'bg-foreground/10 rounded px-1.5 py-0.5',
        'text-[13px] font-mono',
        'text-foreground/90'
      )}
    >
      {children}
    </code>
  )
}

/**
 * Custom link component
 */
interface LinkComponentProps {
  href?: string | undefined
  children?: React.ReactNode
}

function LinkComponent({ href, children }: LinkComponentProps) {
  const isExternal = href?.startsWith('http')

  if (isExternal) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          'text-accent hover:underline',
          'inline-flex items-center gap-1'
        )}
      >
        {children}
        <ExternalLink className="h-3 w-3" aria-hidden="true" />
      </a>
    )
  }

  return (
    <a href={href} className="text-accent hover:underline">
      {children}
    </a>
  )
}

// =============================================================================
// Custom Components Map
// =============================================================================

const markdownComponents = {
  // Headings
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-xl font-semibold mt-5 mb-3 text-foreground">
      {children}
    </h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-lg font-semibold mt-4 mb-2 text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-base font-semibold mt-3 mb-2 text-foreground">
      {children}
    </h3>
  ),
  h4: ({ children }: { children?: React.ReactNode }) => (
    <h4 className="text-sm font-semibold mt-3 mb-1 text-foreground">
      {children}
    </h4>
  ),

  // Paragraphs
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 last:mb-0 text-foreground/90 leading-relaxed">
      {children}
    </p>
  ),

  // Lists
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="mb-3 pl-5 list-disc space-y-1 text-foreground/90">
      {children}
    </ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="mb-3 pl-5 list-decimal space-y-1 text-foreground/90">
      {children}
    </ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="leading-relaxed">{children}</li>
  ),

  // Links
  a: LinkComponent,

  // Code
  code: ({
    inline,
    className,
    children,
    ...props
  }: {
    inline?: boolean | undefined
    className?: string | undefined
    children?: React.ReactNode
  }) => {
    // Extract language from className (e.g., "language-typescript")
    const match = /language-(\w+)/.exec(className || '')
    const language = match ? match[1] : undefined

    // If it's a block code (inside pre), render with copy button
    if (!inline && typeof children === 'string') {
      return <CodeBlock language={language}>{children}</CodeBlock>
    }

    // Inline code
    return <InlineCode>{children}</InlineCode>
  },

  // Pre - just pass through, code component handles rendering
  pre: ({ children }: { children?: React.ReactNode }) => (
    <div className="mb-3">{children}</div>
  ),

  // Blockquote
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote
      className={cn(
        'border-l-2 border-accent pl-4 my-3',
        'italic text-muted-foreground'
      )}
    >
      {children}
    </blockquote>
  ),

  // Horizontal rule
  hr: () => <hr className="border-foreground/10 my-4" />,

  // Strong and emphasis
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-foreground">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic">{children}</em>
  ),

  // Tables
  table: ({ children }: { children?: React.ReactNode }) => (
    <div className="overflow-x-auto mb-3">
      <table className="w-full border-collapse text-[13px]">{children}</table>
    </div>
  ),
  thead: ({ children }: { children?: React.ReactNode }) => (
    <thead className="bg-foreground/5">{children}</thead>
  ),
  tbody: ({ children }: { children?: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  tr: ({ children }: { children?: React.ReactNode }) => (
    <tr className="border-b border-foreground/10">{children}</tr>
  ),
  th: ({ children }: { children?: React.ReactNode }) => (
    <th className="px-3 py-2 text-left font-medium text-foreground">
      {children}
    </th>
  ),
  td: ({ children }: { children?: React.ReactNode }) => (
    <td className="px-3 py-2 text-foreground/90">{children}</td>
  ),

  // Task list items (GFM)
  input: ({ checked }: { checked?: boolean | undefined }) => (
    <input
      type="checkbox"
      checked={checked ?? false}
      readOnly
      className="mr-2 accent-accent"
    />
  ),

  // Images
  img: ({
    src,
    alt,
  }: {
    src?: string | undefined
    alt?: string | undefined
  }) => (
    <img
      src={src ?? ''}
      alt={alt ?? ''}
      loading="lazy"
      className="max-w-full h-auto rounded-lg my-3"
    />
  ),
}

// =============================================================================
// Component
// =============================================================================

/**
 * MarkdownRenderer - Renders markdown content with chat-optimized styling
 *
 * @example
 * ```tsx
 * <MarkdownRenderer
 *   content="# Hello\n\nThis is **bold** text."
 *   compact={false}
 * />
 * ```
 */
export function MarkdownRenderer({
  content,
  className,
  compact = false,
}: MarkdownRendererProps) {
  // Don't render if no content
  if (!content || content.trim().length === 0) {
    return null
  }

  return (
    <div
      className={cn(
        // Base prose styles
        'prose prose-sm prose-invert max-w-none',
        // Size based on compact mode
        compact ? 'text-[12px]' : 'text-[13px]',
        // Override prose colors for dark theme
        'prose-headings:text-foreground',
        'prose-p:text-foreground/90',
        'prose-strong:text-foreground',
        'prose-code:text-foreground/90',
        'prose-a:text-accent',
        'prose-blockquote:text-muted-foreground',
        'prose-li:text-foreground/90',
        // Additional styling
        'leading-relaxed',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={markdownComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

export default MarkdownRenderer
