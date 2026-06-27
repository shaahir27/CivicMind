import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  envDir: '../../',
  resolve: {
    alias: {
      '@civicmind/shared': resolve(__dirname, '../shared/src'),
    },
  },
  server: {
    port: 5175,
    strictPort: true,
  },
});
