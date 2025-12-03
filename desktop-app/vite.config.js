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
  },
});
