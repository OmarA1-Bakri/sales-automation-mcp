import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0', // Listen on all interfaces for Docker
    cors: true, // Enable CORS for E2E test containers
    allowedHosts: true, // Allow all hosts (needed for Docker networking)
  },
  build: {
    outDir: 'dist',
    // Strip console.error/warn in production builds
    // This removes development-only debugging statements from production
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: ['error', 'warn', 'debug'],
        drop_debugger: true,
      },
    },
  },
});
