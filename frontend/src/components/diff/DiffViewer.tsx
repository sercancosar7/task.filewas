/**
 * DiffViewer Component
 *
 * Multi-file diff viewer container component
 * Sol tarafta dosya listesi, sağda diff içeriği gösterilir
 */

import * as React from 'react';
import { X, FileDiff } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileList } from './FileList';
import { DiffContent } from './DiffContent';
import type { DiffViewerProps } from './types';
import { cn } from '@/lib/utils';

export const DiffViewer: React.FC<DiffViewerProps> = ({
  files,
  diffs,
  selectedFile,
  onSelectFile,
  onClose,
  title = 'Değişiklikler',
  className,
}) => {
  // İlk açılışta ilk dosyayı seç
  React.useEffect(() => {
    if (!selectedFile && files.length > 0) {
      onSelectFile(files[0].path);
    }
  }, [files, selectedFile, onSelectFile]);

  // Seçili dosyanın diff verisini bul
  const selectedDiff = selectedFile ? diffs[selectedFile] : null;
  const selectedFileData = files.find((f) => f.path === selectedFile);

  if (files.length === 0) {
    return (
      <Card className={cn('border-foreground/10', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileDiff className="h-12 w-12 text-foreground/30 mb-4" />
          <p className="text-foreground/60 text-sm">Gösterilecek değişiklik yok</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('border-foreground/10 overflow-hidden', className)}>
      {/* Header */}
      <CardHeader className="border-b border-foreground/10 py-3 px-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[15px] font-medium flex items-center gap-2">
            <FileDiff className="h-4 w-4 text-accent" />
            {title} ({files.length} dosya)
          </CardTitle>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      {/* Content - Two Column Layout */}
      <CardContent className="p-0">
        <div className="flex h-[500px]">
          {/* Left - File List */}
          <div className="w-64 border-r border-foreground/10 overflow-y-auto scrollbar-thin">
            <FileList
              files={files}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
            />
          </div>

          {/* Right - Diff Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin">
            {selectedDiff && selectedFileData ? (
              <DiffContent
                diff={selectedDiff}
                status={selectedFileData.status}
                className="h-full"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-foreground/40 text-sm">
                Bir dosya seçin
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

DiffViewer.displayName = 'DiffViewer';
