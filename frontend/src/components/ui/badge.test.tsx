/**
 * Badge component tests
 * @module @task-filewas/frontend/components/ui/badge.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Badge, StatusBadge, PermissionBadge, CountBadge } from './badge';

describe('Badge', () => {
  it('should render badge with default variant', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge).toBeInTheDocument();
    expect(badge.tagName).toBe('SPAN');
  });

  it('should apply variant classes correctly', () => {
    const { rerender } = render(<Badge variant="success">Success</Badge>);
    const badge = screen.getByText('Success');
    expect(badge).toHaveClass('bg-success-10');

    rerender(<Badge variant="destructive">Error</Badge>);
    expect(badge).toHaveClass('bg-destructive-10');
  });

  it('should apply size classes correctly', () => {
    const { rerender } = render(<Badge size="xs">XS</Badge>);
    const badge = screen.getByText('XS');
    expect(badge).toHaveClass('h-4');

    rerender(<Badge size="lg">LG</Badge>);
    expect(badge).toHaveClass('h-7');
  });

  it('should render with left icon', () => {
    render(
      <Badge leftIcon={<span data-testid="left-icon">L</span>}>
        With Icon
      </Badge>
    );
    const icon = screen.getByTestId('left-icon');
    expect(icon).toBeInTheDocument();
  });

  it('should render with right icon', () => {
    render(
      <Badge rightIcon={<span data-testid="right-icon">R</span>}>
        With Icon
      </Badge>
    );
    const icon = screen.getByTestId('right-icon');
    expect(icon).toBeInTheDocument();
  });

  it('should apply custom bgColor and textColor', () => {
    render(
      <Badge bgColor="#ff0000" textColor="#00ff00">
        Custom
      </Badge>
    );
    const badge = screen.getByText('Custom');
    expect(badge).toHaveStyle({ backgroundColor: '#ff0000' });
    expect(badge).toHaveStyle({ color: '#00ff00' });
  });

  it('should apply maxWidth style', () => {
    render(<Badge maxWidth={100}>Long text that should truncate</Badge>);
    const badge = screen.getByText(/Long text/);
    expect(badge).toHaveStyle({ maxWidth: '100px' });
    expect(badge).toHaveClass('truncate');
  });
});

describe('StatusBadge', () => {
  it('should render correct config for each status', () => {
    const { rerender } = render(<StatusBadge status="todo" />);
    expect(screen.getByText('Todo')).toHaveClass('bg-foreground/7');

    rerender(<StatusBadge status="in-progress" />);
    expect(screen.getByText('In Progress')).toHaveClass('bg-accent-10');

    rerender(<StatusBadge status="done" />);
    expect(screen.getByText('Done')).toHaveClass('bg-success-10');
  });

  it('should render custom label when provided', () => {
    render(<StatusBadge status="todo">Custom Todo</StatusBadge>);
    expect(screen.getByText('Custom Todo')).toBeInTheDocument();
  });
});

describe('PermissionBadge', () => {
  it('should render correct config for each mode', () => {
    const { rerender } = render(<PermissionBadge mode="safe" />);
    expect(screen.getByText(/Safe/)).toBeInTheDocument();
    expect(screen.getByText('🔍')).toBeInTheDocument();

    rerender(<PermissionBadge mode="ask" />);
    expect(screen.getByText(/Ask/)).toBeInTheDocument();
    expect(screen.getByText('❓')).toBeInTheDocument();

    rerender(<PermissionBadge mode="auto" />);
    expect(screen.getByText(/Auto/)).toBeInTheDocument();
    expect(screen.getByText('🔓')).toBeInTheDocument();
  });
});

describe('CountBadge', () => {
  it('should render count below max', () => {
    render(<CountBadge count={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('should render max+ for count above max', () => {
    render(<CountBadge count={150} max={99} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
  });

  it('should use custom max value', () => {
    render(<CountBadge count={25} max={20} />);
    expect(screen.getByText('20+')).toBeInTheDocument();
  });
});
