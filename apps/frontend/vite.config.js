import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          minSize: 20_000,
          groups: [
            { name: 'react', test: /node_modules\/(react|react-dom|react-router)/ },
            { name: 'icons', test: /node_modules\/@hugeicons/ },
            { name: 'forms', test: /node_modules\/(react-hook-form|zod|@hookform)/ },
            { name: 'table', test: /node_modules\/@tanstack/ },
            { name: 'ui', test: /node_modules\/(radix-ui|sonner|next-themes)/ }
          ]
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src')
    }
  },
  server: {
    port: 5173,
    strictPort: false
  },
  preview: {
    port: 4173,
    strictPort: false
  }
});
