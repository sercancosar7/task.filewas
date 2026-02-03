/**
 * useResizable hook tests
 * @module @task-filewas/frontend/hooks/useResizable.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResizable } from './useResizable';

describe('useResizable', () => {
  beforeEach(() => {
    // Reset document body styles before each test
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  it('should initialize with initial size', () => {
    const { result } = renderHook(() =>
      useResizable({
        initialSize: 220,
        constraints: { min: 180, max: 320 },
      })
    );

    expect(result.current.size).toBe(220);
    expect(result.current.isResizing).toBe(false);
  });

  it('should clamp initial size to constraints', () => {
    const { result } = renderHook(() =>
      useResizable({
        initialSize: 500,
        constraints: { min: 180, max: 320 },
      })
    );

    expect(result.current.size).toBe(320); // Max constraint
  });

  it('should update size within constraints', () => {
    const { result } = renderHook(() =>
      useResizable({
        initialSize: 220,
        constraints: { min: 180, max: 320 },
      })
    );

    act(() => {
      result.current.setSize(250);
    });

    expect(result.current.size).toBe(250);
  });

  it('should clamp size to min constraint', () => {
    const { result } = renderHook(() =>
      useResizable({
        initialSize: 220,
        constraints: { min: 180, max: 320 },
      })
    );

    act(() => {
      result.current.setSize(100);
    });

    expect(result.current.size).toBe(180); // Min constraint
  });

  it('should clamp size to max constraint', () => {
    const { result } = renderHook(() =>
      useResizable({
        initialSize: 220,
        constraints: { min: 180, max: 320 },
      })
    );

    act(() => {
      result.current.setSize(500);
    });

    expect(result.current.size).toBe(320); // Max constraint
  });

  it('should call onSizeChange callback when size changes', () => {
    const onSizeChange = vi.fn();

    const { result } = renderHook(() =>
      useResizable({
        initialSize: 220,
        constraints: { min: 180, max: 320 },
        onSizeChange,
      })
    );

    act(() => {
      result.current.setSize(250);
    });

    expect(onSizeChange).toHaveBeenCalledWith(250);
  });

  it('should provide handleProps with correct cursor for horizontal', () => {
    const { result } = renderHook(() =>
      useResizable({
        initialSize: 220,
        constraints: { min: 180, max: 320 },
        direction: 'horizontal',
      })
    );

    expect(result.current.handleProps.style.cursor).toBe('col-resize');
    expect(result.current.handleProps.onMouseDown).toBeDefined();
  });

  it('should provide handleProps with correct cursor for vertical', () => {
    const { result } = renderHook(() =>
      useResizable({
        initialSize: 220,
        constraints: { min: 180, max: 320 },
        direction: 'vertical',
      })
    );

    expect(result.current.handleProps.style.cursor).toBe('row-resize');
  });

  it('should have correct initial state values', () => {
    const { result } = renderHook(() =>
      useResizable({
        initialSize: 200,
        constraints: { min: 100, max: 400 },
      })
    );

    expect(result.current.size).toBe(200);
    expect(result.current.isResizing).toBe(false);
    expect(result.current.handleProps).toBeDefined();
    expect(result.current.setSize).toBeInstanceOf(Function);
    expect(result.current.startResize).toBeInstanceOf(Function);
  });
});
