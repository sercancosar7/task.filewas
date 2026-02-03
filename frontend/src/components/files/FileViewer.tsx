/**
 * FileViewer Component
 *
 * Dosya içeriğini gösteren component
 * Syntax highlighting ile kod görüntüleme
 */

import * as React from 'react'
import {
  X,
  Copy,
  Check,
  File,
  FileText,
  Image as ImageIcon,
  Download,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { FileViewerProps, FileContent } from './types'

// Language to Shiki theme mapping
const LANGUAGE_MAP: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  jsx: 'javascript',
  tsx: 'typescript',
  python: 'python',
  go: 'go',
  rust: 'rust',
  c: 'c',
  cpp: 'cpp',
  java: 'java',
  csharp: 'csharp',
  php: 'php',
  ruby: 'ruby',
  sql: 'sql',
  html: 'html',
  css: 'css',
  json: 'json',
  yaml: 'yaml',
  markdown: 'markdown',
  bash: 'bash',
  text: 'plaintext',
}

// Get display name for language
function getLanguageName(lang?: string): string {
  if (!lang) return 'Text'
  return LANGUAGE_MAP[lang] || lang
}

// Get icon for file type
function getFileIcon(language?: string, isBinary?: boolean) {
  if (isBinary) {
    return <ImageIcon className="h-4 w-4" />
  }
  if (language && (language.includes('markdown') || language === 'md')) {
    return <FileText className="h-4 w-4" />
  }
  return <File className="h-4 w-4" />
}

export const FileViewer: React.FC<FileViewerProps> = ({
  projectId,
  filePath,
  className,
  onClose,
}) => {
  const [content, setContent] = React.useState<FileContent | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  // Fetch file content
  const fetchContent = React.useCallback(async () => {
    if (!filePath) {
      setContent(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const token = localStorage.getItem('token')
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(
        `/api/projects/${projectId}/files/${filePath}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to load file')
      }

      const result = await response.json()
      setContent(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load file')
      setContent(null)
    } finally {
      setLoading(false)
    }
  }, [projectId, filePath])

  // Load content when filePath changes
  React.useEffect(() => {
    fetchContent()
  }, [fetchContent])

  // Copy to clipboard
  const handleCopy = async () => {
    if (content?.content) {
      try {
        await navigator.clipboard.writeText(content.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        // Fallback for older browsers
        const textarea = document.createElement('textarea')
        textarea.value = content.content
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  // Download file
  const handleDownload = () => {
    if (content?.content) {
      const blob = new Blob([content.content], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = content.name
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }

  // Get file name from path
  const fileName = filePath?.split('/').pop() || 'Unknown'

  return (
    <Card className={cn('border-foreground/10 overflow-hidden flex flex-col', className)}>
      {/* Header */}
      <CardHeader className="border-b border-foreground/10 py-2 px-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[13px] font-medium flex items-center gap-2">
            {content ? getFileIcon(content.language, content.isBinary) : <File className="h-4 w-4" />}
            <span className="truncate max-w-[200px]">{fileName}</span>
            {content?.language && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-foreground/10 text-foreground/60 font-mono">
                {getLanguageName(content.language)}
              </span>
            )}
            {content?.size !== undefined && (
              <span className="text-[10px] text-foreground/40">
                {(content.size / 1024).toFixed(1)} KB
              </span>
            )}
          </CardTitle>

          <div className="flex items-center gap-1">
            {/* Copy Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              disabled={!content || loading}
              className="h-7 w-7"
              title="Kopyala"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>

            {/* Download Button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDownload}
              disabled={!content || loading}
              className="h-7 w-7"
              title="İndir"
            >
              <Download className="h-3.5 w-3.5" />
            </Button>

            {/* Close Button */}
            {onClose && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onClose}
                className="h-7 w-7"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      {/* Content */}
      <CardContent className="p-0 flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-5 w-5 animate-spin text-foreground/30" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-4">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-sm text-foreground/60 mb-1">Dosya yüklenemedi</p>
            <p className="text-xs text-foreground/40">{error}</p>
          </div>
        ) : !content ? (
          <div className="flex items-center justify-center h-64 text-foreground/40 text-sm">
            Dosya seçilmedi
          </div>
        ) : content.isBinary ? (
          <div className="flex flex-col items-center justify-center h-64 text-center p-4">
            <ImageIcon className="h-8 w-8 text-foreground/30 mb-2" />
            <p className="text-sm text-foreground/60 mb-1">Binary dosya</p>
            <p className="text-xs text-foreground/40">
              Bu dosya türü görüntülenemiyor ({content.size} bytes)
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              className="mt-4"
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              İndir
            </Button>
          </div>
        ) : (
          <pre className="p-3 text-[12px] leading-relaxed overflow-x-auto">
            <code className="font-mono">{content.content}</code>
          </pre>
        )}
      </CardContent>
    </Card>
  )
}

FileViewer.displayName = 'FileViewer'
