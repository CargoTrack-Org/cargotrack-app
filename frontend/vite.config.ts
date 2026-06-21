import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// For local development (npm run dev), Vite proxies API requests to the backend.
// Set VITE_DEV_BACKEND_URL to point to your backend if not running on localhost:4000.
const backendUrl = process.env.VITE_DEV_BACKEND_URL || 'http://localhost:4000';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
      '/uploads': {
        target: backendUrl,
        changeOrigin: true,
      },
    },
  },
});
