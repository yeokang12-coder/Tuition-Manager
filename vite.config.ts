import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './', // Use relative path for universal hosting (GitHub Pages compatible)
  server: {
    port: 5173,
    host: true,
  },
});
