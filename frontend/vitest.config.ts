import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  define: {
    // React development mode - bu sayede act() desteklenir
    'process.env.NODE_ENV': '"development"',
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.{test,spec}.{ts,tsx}', '**/__tests__/**/*.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    deps: {
      // React ve modüllerini inline yap - development build kullanması için
      inline: [/react/, /react-dom/, '@testing-library/react', '@testing-library/jest-dom'],
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/types/**/*',
        'src/vite-env.d.ts',
        'src/main.tsx',
        'src/test/**/*',
      ],
      all: true,
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
    setupFiles: ['./src/test/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
