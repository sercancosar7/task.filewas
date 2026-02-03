/**
 * Utils tests
 * @module @task-filewas/frontend/lib/utils.test
 */

import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn (className utility)', () => {
  it('should merge class names correctly', () => {
    expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
  });

  it('should handle Tailwind class conflicts (later wins)', () => {
    // twMerge should resolve conflicts
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('should handle conditional classes', () => {
    expect(cn('base-class', true && 'active', false && 'inactive')).toBe(
      'base-class active'
    );
  });

  it('should handle undefined and null values', () => {
    expect(cn('base-class', undefined, null, 'another-class')).toBe(
      'base-class another-class'
    );
  });

  it('should handle empty input', () => {
    expect(cn()).toBe('');
  });

  it('should handle arrays of classes', () => {
    expect(cn(['px-2', 'py-1'], 'mt-4')).toBe('px-2 py-1 mt-4');
  });

  it('should handle objects with boolean values', () => {
    expect(cn({ 'px-2': true, 'py-1': false, 'mt-4': true })).toBe(
      'px-2 mt-4'
    );
  });
});
