/**
 * useSocket hook tests
 * @module @task-filewas/frontend/hooks/useSocket.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSocket } from './useSocket';

// Mock socket module
vi.mock('../lib/socket', () => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  isConnected: vi.fn(() => false),
  getStatus: vi.fn(() => 'disconnected'),
  getClientId: vi.fn(() => null),
  onStatusChange: vi.fn(() => vi.fn()),
  onMessage: vi.fn(() => vi.fn()),
  emit: vi.fn(() => false),
  sendMessage: vi.fn(() => false),
  joinSession: vi.fn(() => false),
  leaveSession: vi.fn(() => false),
  joinProject: vi.fn(() => false),
  leaveProject: vi.fn(() => false),
}));

import * as socketModule from '../lib/socket';

describe('useSocket', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default status', () => {
    const { result } = renderHook(() => useSocket());

    expect(result.current.status).toBe('disconnected');
    expect(result.current.isConnected).toBe(false);
    expect(result.current.clientId).toBe(null);
    expect(result.current.lastMessage).toBe(null);
  });

  it('should call connect on mount when autoConnect is true', () => {
    const connectSpy = vi.spyOn(socketModule, 'connect');

    renderHook(() => useSocket({ autoConnect: true }));

    expect(connectSpy).toHaveBeenCalled();
  });

  it('should not call connect on mount when autoConnect is false', () => {
    const connectSpy = vi.spyOn(socketModule, 'connect');

    renderHook(() => useSocket({ autoConnect: false }));

    expect(connectSpy).not.toHaveBeenCalled();
  });

  it('should return connect function', () => {
    const { result } = renderHook(() => useSocket({ autoConnect: false }));

    expect(result.current.connect).toBeDefined();
    expect(result.current.disconnect).toBeDefined();
  });

  it('should return emit function', () => {
    const { result } = renderHook(() => useSocket());

    result.current.emit('test_event', { data: 'test' });

    expect(socketModule.emit).toHaveBeenCalledWith('test_event', {
      data: 'test',
    });
  });

  it('should return sendMessage function', () => {
    const { result } = renderHook(() => useSocket());

    const message = {
      type: 'output' as const,
      payload: { text: 'hello' },
    };

    result.current.sendMessage(message);

    expect(socketModule.sendMessage).toHaveBeenCalledWith(message);
  });

  it('should return joinSession function', () => {
    const { result } = renderHook(() => useSocket());

    result.current.joinSession('session-123');

    expect(socketModule.joinSession).toHaveBeenCalledWith('session-123');
  });

  it('should return leaveSession function', () => {
    const { result } = renderHook(() => useSocket());

    result.current.leaveSession('session-123');

    expect(socketModule.leaveSession).toHaveBeenCalledWith('session-123');
  });

  it('should return joinProject function', () => {
    const { result } = renderHook(() => useSocket());

    result.current.joinProject('project-456');

    expect(socketModule.joinProject).toHaveBeenCalledWith('project-456');
  });

  it('should return leaveProject function', () => {
    const { result } = renderHook(() => useSocket());

    result.current.leaveProject('project-456');

    expect(socketModule.leaveProject).toHaveBeenCalledWith('project-456');
  });

  it('should have all required API functions', () => {
    const { result } = renderHook(() => useSocket());

    expect(result.current.connect).toBeDefined();
    expect(result.current.disconnect).toBeDefined();
    expect(result.current.emit).toBeDefined();
    expect(result.current.sendMessage).toBeDefined();
    expect(result.current.joinSession).toBeDefined();
    expect(result.current.leaveSession).toBeDefined();
    expect(result.current.joinProject).toBeDefined();
    expect(result.current.leaveProject).toBeDefined();
  });
});
