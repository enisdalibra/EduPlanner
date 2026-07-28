import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        statements: 70,
        'src/services/AttendanceService.ts': { branches: 90 },
        'src/services/BackupService.ts': { branches: 90 },
        'src/services/IntegrityService.ts': { branches: 90 },
        'src/services/StudentService.ts': { branches: 90 },
      },
      exclude: [
        'node_modules/',
        'src/setupTests.ts',
        'src/main.tsx',
        'src/vite-env.d.ts',
        '.git/',
        'dist/'
      ]
    },
    include: [
      '__tests__/**/*.{test,spec}.{ts,tsx}',
      'src/**/__tests__/**/*.{test,spec}.{ts,tsx}',
      'src/**/*.{test,spec}.{ts,tsx}'
    ]
  }
});
