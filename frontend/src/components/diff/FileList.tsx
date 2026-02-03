/**
 * FileList Component
 *
 * Değişen dosyaların listesini gösteren sidebar component
 */

import * as React from 'react';
import {
  FilePlus,
  FileEdit,
  Trash2,
  GitCompare,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { FileListProps } from './types';
import {
  getFileStatusColor,
  getFileStatusBg,
} from './types';

export const FileList: React.FC<FileListProps> = ({
  files,
  selectedFile,
  onSelectFile,
  className,
}) => {
  const getStatusIcon = (status: 'added' | 'modified' | 'deleted' | 'renamed') => {
    switch (status) {
      case 'added':
        return <FilePlus className="h-3.5 w-3.5" />;
      case 'deleted':
        return <Trash2 className="h-3.5 w-3.5" />;
      case 'renamed':
        return <GitCompare className="h-3.5 w-3.5" />;
      case 'modified':
      default:
        return <FileEdit className="h-3.5 w-3.5" />;
    }
  };

  // Dosya adını çıkar
  const getFileName = (path: string): string => {
    const parts = path.split('/');
    return parts[parts.length - 1] || path;
  };

  // Dosya dizinini çıkar
  const getFileDir = (path: string): string => {
    const parts = path.split('/');
    if (parts.length <= 1) return '';
    return parts.slice(0, -1).join('/') + '/';
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-foreground/10 text-[11px] font-medium text-foreground/40 uppercase tracking-wide">
        Dosyalar
      </div>

      {/* File List */}
      <ul className="flex flex-col" role="list">
        {files.map((file) => {
          const isSelected = selectedFile === file.path;
          const statusColor = getFileStatusColor(file.status);
          const statusBg = getFileStatusBg(file.status);

          return (
            <li key={file.path}>
              <button
                type="button"
                onClick={() => onSelectFile(file.path)}
                className={cn(
                  'w-full flex items-start gap-2 px-3 py-2 text-left text-[13px] transition-colors',
                  'hover:bg-foreground/5',
                  isSelected && 'bg-foreground/10',
                  isSelected && statusBg
                )}
              >
                {/* Status Icon */}
                <span className={cn('shrink-0 mt-0.5', statusColor)}>
                  {getStatusIcon(file.status)}
                </span>

                {/* File Info */}
                <div className="flex-1 min-w-0">
                  {/* File Name */}
                  <div className={cn(
                    'truncate font-medium',
                    isSelected ? 'text-foreground' : 'text-foreground/80'
                  )}>
                    {getFileName(file.path)}
                  </div>

                  {/* File Directory */}
                  {getFileDir(file.path) && (
                    <div className="text-[11px] text-foreground/40 truncate">
                      {getFileDir(file.path)}
                    </div>
                  )}
                </div>

                {/* Chevron - only when selected */}
                {isSelected && (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-foreground/30 mt-0.5" />
                )}

                {/* Additions/Deletions Badge */}
                {(file.additions !== undefined || file.deletions !== undefined) && (
                  <div className="shrink-0 flex items-center gap-1 text-[10px] ml-1">
                    {file.additions !== undefined && file.additions > 0 && (
                      <span className="text-green-500">+{file.additions}</span>
                    )}
                    {file.deletions !== undefined && file.deletions > 0 && (
                      <span className="text-red-500">-{file.deletions}</span>
                    )}
                  </div>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Footer - Summary */}
      <div className="px-3 py-2 border-t border-foreground/10 text-[11px] text-foreground/40">
        {files.length} dosya değişti
      </div>
    </div>
  );
};

FileList.displayName = 'FileList';
