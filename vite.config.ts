import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/spreadsheet-app/',
  build: {
    rollupOptions: {
      // xlsx is loaded dynamically at runtime for Excel import/export features.
      // JSON and CSV import/export work without it.
      external: ['xlsx'],
    },
  },
});
