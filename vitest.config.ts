import { defineConfig } from 'vitest/config';

export default defineConfig({
  esbuild: {
    target: 'es2022',
  },
  test: {
    coverage: {
      provider: 'v8', // Use c8 for coverage
      reporter: ['text', 'lcov'], // Output formats
      include: ['src/**/*.ts'], // Files to include
      exclude: ['node_modules', 'tests'], // Exclude unnecessary files
    },
  },
});
