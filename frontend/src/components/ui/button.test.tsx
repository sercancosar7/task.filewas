/**
 * Button component tests
 * @module @task-filewas/frontend/components/ui/button.test
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from './button';

describe('Button', () => {
  it('should render button with default variant', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Click me');
  });

  it('should apply variant classes correctly', () => {
    const { rerender } = render(<Button variant="destructive">Delete</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('bg-destructive');

    rerender(<Button variant="outline">Outline</Button>);
    expect(button).toHaveClass('border');
  });

  it('should apply size classes correctly', () => {
    const { rerender } = render(<Button size="sm">Small</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('h-8');

    rerender(<Button size="lg">Large</Button>);
    expect(button).toHaveClass('h-10');
  });

  it('should render as icon size correctly', () => {
    render(<Button size="icon">X</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('h-9');
    expect(button).toHaveClass('w-9');
  });

  it('should be disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:opacity-50');
  });

  it('should render as child when asChild is true', () => {
    render(
      <Button asChild>
        <a href="/test">Link Button</a>
      </Button>
    );
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent('Link Button');
  });

  it('should apply custom className', () => {
    render(<Button className="custom-class">Custom</Button>);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });

  it('should call onClick handler when clicked', () => {
    let clicked = false;
    const handleClick = () => { clicked = true; };

    render(<Button onClick={handleClick}>Click me</Button>);
    const button = screen.getByRole('button');
    button.click();

    expect(clicked).toBe(true);
  });
});
