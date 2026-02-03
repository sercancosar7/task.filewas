/**
 * CodeBlock - Syntax highlighted code block component (Shiki)
 * @module @task-filewas/frontend/components/chat/CodeBlock
 *
 * Features:
 * - Shiki syntax highlighting (github-dark theme)
 * - Copy button with success feedback
 * - Language badge
 * - Line numbers (optional)
 * - Responsive scrolling
 * - Loading state while highlighting
 */

import * as React from 'react'
import { createHighlighter, type Highlighter, type BundledLanguage } from 'shiki'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

// =============================================================================
// Types
// =============================================================================

export interface CodeBlockProps {
  /** Code content to highlight */
  code: string
  /** Programming language (e.g., 'typescript', 'javascript', 'python') */
  language?: string | undefined
  /** Whether to show line numbers */
  showLineNumbers?: boolean | undefined
  /** Additional CSS classes */
  className?: string | undefined
  /** File name to display (optional) */
  filename?: string | undefined
}

// =============================================================================
// Highlighter Singleton
// =============================================================================

// Singleton highlighter instance
let highlighterPromise: Promise<Highlighter> | null = null

// Supported languages - add more as needed
const SUPPORTED_LANGUAGES: BundledLanguage[] = [
  'javascript',
  'typescript',
  'tsx',
  'jsx',
  'json',
  'html',
  'css',
  'scss',
  'python',
  'bash',
  'shell',
  'yaml',
  'markdown',
  'sql',
  'go',
  'rust',
  'java',
  'c',
  'cpp',
  'csharp',
  'php',
  'ruby',
  'swift',
  'kotlin',
  'docker',
  'diff',
  'graphql',
  'xml',
  'vue',
  'svelte',
]

/**
 * Get or create the highlighter instance
 */
function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: ['github-dark'],
      langs: SUPPORTED_LANGUAGES,
    })
  }
  return highlighterPromise
}

/**
 * Normalize language name
 */
function normalizeLanguage(lang?: string): BundledLanguage | 'text' {
  if (!lang) return 'text'

  const normalized = lang.toLowerCase().trim()

  // Common aliases
  const aliases: Record<string, BundledLanguage> = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    sh: 'bash',
    zsh: 'bash',
    yml: 'yaml',
    md: 'markdown',
    dockerfile: 'docker',
    'c++': 'cpp',
    'c#': 'csharp',
  }

  const mappedLang = aliases[normalized] || normalized

  // Check if language is supported
  if (SUPPORTED_LANGUAGES.includes(mappedLang as BundledLanguage)) {
    return mappedLang as BundledLanguage
  }

  return 'text'
}

/**
 * Format language name for display
 */
function formatLanguageName(lang: string): string {
  const displayNames: Record<string, string> = {
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    tsx: 'TSX',
    jsx: 'JSX',
    json: 'JSON',
    html: 'HTML',
    css: 'CSS',
    scss: 'SCSS',
    python: 'Python',
    bash: 'Bash',
    shell: 'Shell',
    yaml: 'YAML',
    markdown: 'Markdown',
    sql: 'SQL',
    go: 'Go',
    rust: 'Rust',
    java: 'Java',
    c: 'C',
    cpp: 'C++',
    csharp: 'C#',
    php: 'PHP',
    ruby: 'Ruby',
    swift: 'Swift',
    kotlin: 'Kotlin',
    docker: 'Docker',
    diff: 'Diff',
    graphql: 'GraphQL',
    xml: 'XML',
    vue: 'Vue',
    svelte: 'Svelte',
    text: 'Text',
  }

  return displayNames[lang] || lang.toUpperCase()
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Hook for syntax highlighting
 */
function useHighlightedCode(code: string, language: string): {
  html: string
  isLoading: boolean
  error: Error | null
} {
  const [html, setHtml] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<Error | null>(null)

  React.useEffect(() => {
    let cancelled = false

    async function highlight() {
      try {
        setIsLoading(true)
        setError(null)

        const normalizedLang = normalizeLanguage(language)

        // For plain text, just escape HTML
        if (normalizedLang === 'text') {
          const escaped = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
          setHtml(`<pre class="shiki"><code>${escaped}</code></pre>`)
          setIsLoading(false)
          return
        }

        const highlighter = await getHighlighter()

        if (cancelled) return

        const highlighted = highlighter.codeToHtml(code, {
          lang: normalizedLang,
          theme: 'github-dark',
        })

        if (cancelled) return

        setHtml(highlighted)
      } catch (err) {
        if (!cancelled) {
          console.error('Failed to highlight code:', err)
          setError(err instanceof Error ? err : new Error('Highlighting failed'))
          // Fallback to escaped plain text
          const escaped = code
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
          setHtml(`<pre class="shiki"><code>${escaped}</code></pre>`)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    highlight()

    return () => {
      cancelled = true
    }
  }, [code, language])

  return { html, isLoading, error }
}

// =============================================================================
// Sub-Components
// =============================================================================

/**
 * Copy button component
 */
interface CopyButtonProps {
  code: string
  className?: string | undefined
}

function CopyButton({ code, className }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }, [code])

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleCopy}
      className={cn(
        'h-7 w-7 rounded-[4px]',
        'text-muted-foreground hover:text-foreground',
        'hover:bg-foreground/10',
        'opacity-0 group-hover:opacity-100 transition-opacity',
        className
      )}
      title={copied ? 'Kopyalandi!' : 'Kodu kopyala'}
      aria-label={copied ? 'Kopyalandi' : 'Kodu kopyala'}
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-success" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </Button>
  )
}

/**
 * Language badge component
 */
interface LanguageBadgeProps {
  language: string
  className?: string | undefined
}

function LanguageBadge({ language, className }: LanguageBadgeProps) {
  const displayName = formatLanguageName(language)

  return (
    <span
      className={cn(
        'text-[10px] font-medium uppercase tracking-wide',
        'text-muted-foreground/70',
        'select-none',
        className
      )}
    >
      {displayName}
    </span>
  )
}

/**
 * File name badge component
 */
interface FilenameBadgeProps {
  filename: string
  className?: string | undefined
}

function FilenameBadge({ filename, className }: FilenameBadgeProps) {
  return (
    <span
      className={cn(
        'text-[11px] font-mono',
        'text-foreground/70',
        'select-none',
        className
      )}
    >
      {filename}
    </span>
  )
}

// =============================================================================
// Component
// =============================================================================

/**
 * CodeBlock - Syntax highlighted code block with copy functionality
 *
 * @example
 * ```tsx
 * <CodeBlock
 *   code="const greeting = 'Hello, World!';"
 *   language="typescript"
 *   showLineNumbers={true}
 * />
 * ```
 */
export function CodeBlock({
  code,
  language = 'text',
  showLineNumbers = false,
  className,
  filename,
}: CodeBlockProps) {
  const normalizedLang = normalizeLanguage(language)
  const { html, isLoading } = useHighlightedCode(code, language)

  // Add line numbers if enabled
  const processedHtml = React.useMemo(() => {
    if (!showLineNumbers || !html) return html

    // Parse the HTML and add line numbers
    const lines = code.split('\n')
    const lineNumberWidth = String(lines.length).length

    // Create line numbers column
    const lineNumbers = lines
      .map(
        (_, i) =>
          `<span class="line-number" style="width: ${lineNumberWidth}ch">${i + 1}</span>`
      )
      .join('\n')

    // Wrap the content
    return `<div class="code-with-line-numbers">${html}<div class="line-numbers">${lineNumbers}</div></div>`
  }, [html, showLineNumbers, code])

  return (
    <div
      className={cn(
        // Container
        'relative group',
        'rounded-[8px] overflow-hidden',
        'border border-foreground/10',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex items-center justify-between',
          'px-3 py-2',
          'bg-foreground/[0.03]',
          'border-b border-foreground/10'
        )}
      >
        {/* Left: Language badge or filename */}
        <div className="flex items-center gap-2">
          {filename ? (
            <FilenameBadge filename={filename} />
          ) : (
            <LanguageBadge language={normalizedLang} />
          )}
        </div>

        {/* Right: Copy button */}
        <CopyButton code={code} className="opacity-100 md:opacity-0" />
      </div>

      {/* Code content */}
      <div
        className={cn(
          'overflow-x-auto',
          'bg-[#0d1117]', // GitHub dark background
          'text-[13px] font-mono leading-relaxed',
          isLoading && 'animate-pulse'
        )}
      >
        {isLoading ? (
          // Loading state
          <pre className="p-4">
            <code className="text-foreground/50">{code}</code>
          </pre>
        ) : (
          // Highlighted code
          <div
            className={cn(
              'shiki-code',
              '[&_.shiki]:!bg-transparent',
              '[&_.shiki]:p-4',
              '[&_.shiki]:m-0',
              '[&_code]:!bg-transparent',
              '[&_pre]:!bg-transparent',
              '[&_pre]:m-0',
              // Line numbers styling
              showLineNumbers && [
                '[&_.code-with-line-numbers]:relative',
                '[&_.code-with-line-numbers]:pl-12',
                '[&_.line-numbers]:absolute',
                '[&_.line-numbers]:left-0',
                '[&_.line-numbers]:top-4',
                '[&_.line-numbers]:flex',
                '[&_.line-numbers]:flex-col',
                '[&_.line-numbers]:text-right',
                '[&_.line-numbers]:pr-3',
                '[&_.line-numbers]:border-r',
                '[&_.line-numbers]:border-foreground/10',
                '[&_.line-number]:text-muted-foreground/50',
                '[&_.line-number]:text-[12px]',
                '[&_.line-number]:leading-relaxed',
              ]
            )}
            dangerouslySetInnerHTML={{ __html: processedHtml }}
          />
        )}
      </div>
    </div>
  )
}

export default CodeBlock
