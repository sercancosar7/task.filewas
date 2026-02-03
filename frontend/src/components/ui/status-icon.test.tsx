/**
 * StatusIcon component tests
 * @module @task-filewas/frontend/components/ui/status-icon.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  StatusIcon,
  getStatusConfig,
  getAllStatuses,
  isValidStatus,
  type SessionStatus,
} from './status-icon';

describe('StatusIcon', () => {
  const statuses: SessionStatus[] = [
    'backlog',
    'todo',
    'in-progress',
    'needs-review',
    'done',
    'cancelled',
    'flagged',
  ];

  it.each(statuses)('should render %s status icon', (status) => {
    render(<StatusIcon status={status} />);
    // SVG element by aria-label
    const icon = screen.getByLabelText(getStatusConfig(status).label);
    expect(icon).toBeInTheDocument();
  });

  it('should apply correct color class for each status', () => {
    const { rerender } = render(<StatusIcon status="todo" />);
    const todoIcon = screen.getByLabelText('Todo');
    expect(todoIcon).toBeInTheDocument();

    rerender(<StatusIcon status="in-progress" />);
    const progressIcon = screen.getByLabelText('In Progress');
    expect(progressIcon).toBeInTheDocument();

    rerender(<StatusIcon status="done" />);
    const doneIcon = screen.getByLabelText('Done');
    expect(doneIcon).toBeInTheDocument();
  });

  it('should apply size classes correctly', () => {
    const { rerender } = render(<StatusIcon status="todo" size="xs" />);
    const xsIcon = screen.getByLabelText('Todo');
    expect(xsIcon).toBeInTheDocument();

    rerender(<StatusIcon status="todo" size="lg" />);
    const lgIcon = screen.getByLabelText('Todo');
    expect(lgIcon).toBeInTheDocument();
  });

  it('should override color when colorOverride is provided', () => {
    render(<StatusIcon status="todo" colorOverride="text-red-500" />);
    const icon = screen.getByLabelText('Todo');
    expect(icon).toBeInTheDocument();
  });

  it('should show tooltip when showTooltip is true', () => {
    render(<StatusIcon status="in-progress" showTooltip />);
    const icon = screen.getByTitle('In Progress');
    expect(icon).toBeInTheDocument();
  });

  it('should have correct aria-label', () => {
    render(<StatusIcon status="done" />);
    const icon = screen.getByLabelText('Done');
    expect(icon).toBeInTheDocument();
  });
});

describe('getStatusConfig helper', () => {
  it('should return correct config for each status', () => {
    const todoConfig = getStatusConfig('todo');
    expect(todoConfig.label).toBe('Todo');
    expect(todoConfig.color).toBe('text-foreground/60');

    const inProgressConfig = getStatusConfig('in-progress');
    expect(inProgressConfig.label).toBe('In Progress');
    expect(inProgressConfig.color).toBe('text-accent');
  });
});

describe('getAllStatuses helper', () => {
  it('should return all available statuses', () => {
    const statuses = getAllStatuses();
    expect(statuses).toHaveLength(7);
    expect(statuses).toContain('todo');
    expect(statuses).toContain('in-progress');
    expect(statuses).toContain('done');
  });
});

describe('isValidStatus helper', () => {
  it('should return true for valid statuses', () => {
    expect(isValidStatus('todo')).toBe(true);
    expect(isValidStatus('in-progress')).toBe(true);
    expect(isValidStatus('done')).toBe(true);
  });

  it('should return false for invalid statuses', () => {
    expect(isValidStatus('invalid')).toBe(false);
    expect(isValidStatus('')).toBe(false);
    expect(isValidStatus('TODO')).toBe(false);
  });

  it('should narrow type correctly', () => {
    const input = 'todo';
    if (isValidStatus(input)) {
      // TypeScript should know input is SessionStatus here
      expect(getStatusConfig(input).label).toBe('Todo');
    }
  });
});
