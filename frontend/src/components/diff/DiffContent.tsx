/**
 * DiffContent Component
 *
 * Tek bir dosyanın diff içeriğini gösterir
 * react-diff-viewer-continued kullanır
 */

import * as React from 'react';
import { FilePlus, Trash2 } from 'lucide-react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { cn } from '@/lib/utils';
import type { DiffContentProps } from './types';

// Dark theme for diff viewer
const darkTheme = {
  variables: {
    dark: {
      background: 'transparent',
      foreground: '#f5f5f7',
      addedBackground: '#22c55e20',
      addedForeground: '#4ade80',
      removedBackground: '#ef444420',
      removedForeground: '#f87171',
      wordAddedBackground: '#22c55e30',
      wordRemovedBackground: '#ef444430',
      addedGutterBackground: '#22c55e10',
      removedGutterBackground: '#ef444410',
      gutterBackground: 'transparent',
      gutterForeground: '#71717a',
      highlightBackground: '#6366f120',
      highlightGutterBackground: '#6366f120',
      codeFoldGutterBackground: 'transparent',
      codeFoldBackground: 'transparent',
      emptyLineBackground: 'transparent',
      gutterActiveBackground: 'transparent',
      diffViewerBackground: 'transparent',
      diffViewerTitleBackground: 'transparent',
      diffViewerTitleColor: '#f5f5f7',
      diffViewerTitleBorderColor: '#27272a',
    },
  },
};

// Line highlight function
const lineClassName = ({ type }: { type: string }): string => {
  if (type === 'deleted') return 'deleted-line';
  if (type === 'added') return 'added-line';
  return '';
};

export const DiffContent: React.FC<DiffContentProps> = ({
  diff,
  status,
  className,
}) => {
  // Deleted dosya için sadece eski içeriği göster
  if (status === 'deleted') {
    return (
      <div className={cn('h-full flex flex-col', className)}>
        {/* Header */}
        <div className="px-4 py-2 border-b border-foreground/10 bg-destructive/10">
          <div className="flex items-center gap-2 text-destructive text-[13px] font-medium">
            <Trash2 className="h-4 w-4" />
            {diff.oldFileName || diff.fileName || 'Dosya'} silindi
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-[13px] font-mono text-foreground/70 line-through opacity-60">
            {diff.oldValue || '<i>boş</i>'}
          </pre>
        </div>
      </div>
    );
  }

  // Added dosya için sadece yeni içeriği göster
  if (status === 'added') {
    return (
      <div className={cn('h-full flex flex-col', className)}>
        {/* Header */}
        <div className="px-4 py-2 border-b border-foreground/10 bg-success/10">
          <div className="flex items-center gap-2 text-success text-[13px] font-medium">
            <FilePlus className="h-4 w-4" />
            {diff.fileName || 'Dosya'} eklendi
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4">
          <pre className="text-[13px] font-mono text-foreground">
            {diff.newValue || '<i>boş</i>'}
          </pre>
        </div>
      </div>
    );
  }

  // Normal diff view (modified)
  return (
    <div className={cn('h-full flex flex-col', className)}>
      {/* Header */}
      <div className="px-4 py-2 border-b border-foreground/10 bg-foreground/5">
        <div className="text-[13px] font-medium text-foreground/80">
          {diff.fileName || diff.oldFileName || 'Değişiklik'}
        </div>
      </div>

      {/* Diff Viewer */}
      <div className="flex-1 overflow-auto custom-diff-viewer">
        <ReactDiffViewer
          oldValue={diff.oldValue || ''}
          newValue={diff.newValue || ''}
          splitView={true}
          useDarkTheme={true}
          leftTitle={diff.oldFileName || 'Eski'}
          rightTitle={diff.fileName || 'Yeni'}
          hideLineNumbers={false}
          showDiffOnly={false}
          lineClassName={lineClassName}
          styles={darkTheme}
        />
      </div>
    </div>
  );
};

DiffContent.displayName = 'DiffContent';
