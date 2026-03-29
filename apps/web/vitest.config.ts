import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: [
        'src/app/api/chat/**/*.ts',
        'src/app/api/upload/**/*.ts',
        'src/app/api/articles/publish/**/*.ts',
        'src/app/api/articles/my/**/*.ts',
        'src/lib/plan-limits.ts',
        'src/lib/upload.ts',
      ],
      exclude: ['**/*.test.ts', '**/setup.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@ai-news/db': path.resolve(__dirname, '../../packages/db'),
    },
  },
})
