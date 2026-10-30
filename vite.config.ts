import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',
  build: { outDir: '../dist', emptyOutDir: true },
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        // The API compares Origin with Host; preserve the browser's public host.
        changeOrigin: false,
      },
    },
  },
});
