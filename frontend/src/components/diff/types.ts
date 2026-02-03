/**
 * Diff Viewer Types
 *
 * Multi-file diff viewer için tip tanımlamaları
 */

export interface FileChange {
  path: string;
  oldPath?: string; // renamed dosyalar için
  status: 'added' | 'modified' | 'deleted' | 'renamed';
  additions?: number;
  deletions?: number;
}

export interface DiffData {
  oldValue: string;
  newValue: string;
  fileName?: string;
  oldFileName?: string;
}

export interface DiffViewerProps {
  /**
   * Tüm değişen dosyaların listesi
   */
  files: FileChange[];

  /**
   * Diff verileri (dosya path -> diff data map)
   */
  diffs: { [key: string]: DiffData };

  /**
   * Şu anda açık olan dosya path'i
   */
  selectedFile: string | null;

  /**
   * Dosya seçildiğinde çağrılır
   */
  onSelectFile: (path: string) => void;

  /**
   * Diff viewer kapatıldığında çağrılır
   */
  onClose?: () => void;

  /**
   * Başlık metni
   */
  title?: string;

  /**
   * Ekstra className
   */
  className?: string;
}

export interface FileListProps {
  /**
   * Değişen dosyalar listesi
   */
  files: FileChange[];

  /**
   * Seçili dosya path'i
   */
  selectedFile: string | null;

  /**
   * Dosya seçildiğinde çağrılır
   */
  onSelectFile: (path: string) => void;

  /**
   * Ekstra className
   */
  className?: string;
}

export interface DiffContentProps {
  /**
   * Gösterilecek diff verisi
   */
  diff: DiffData;

  /**
   * Dosya durumu
   */
  status: FileChange['status'];

  /**
   * Ekstra className
   */
  className?: string;
}

/**
 * Dosya durumuna göre icon
 */
export const getFileStatusIcon = (status: FileChange['status']): string => {
  switch (status) {
    case 'added':
      return '+';
    case 'deleted':
      return '-';
    case 'renamed':
      return '→';
    case 'modified':
    default:
      return '±';
  }
};

/**
 * Dosya durumuna göre renk
 */
export const getFileStatusColor = (status: FileChange['status']): string => {
  switch (status) {
    case 'added':
      return 'text-green-500';
    case 'deleted':
      return 'text-red-500';
    case 'renamed':
      return 'text-blue-500';
    case 'modified':
    default:
      return 'text-yellow-500';
  }
};

/**
 * Dosya durumuna göre background color
 */
export const getFileStatusBg = (status: FileChange['status']): string => {
  switch (status) {
    case 'added':
      return 'bg-green-500/10';
    case 'deleted':
      return 'bg-red-500/10';
    case 'renamed':
      return 'bg-blue-500/10';
    case 'modified':
    default:
      return 'bg-yellow-500/10';
  }
};
