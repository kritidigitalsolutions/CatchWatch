import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5400,
    proxy: {
      '/bunny-stream': {
        target: 'https://vz-87171daa-e3e.b-cdn.net',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/bunny-stream/, ''),
        headers: {
          Referer: 'https://admin.catchandwatch.com',
          Origin: 'https://admin.catchandwatch.com',
        },
      },
    },
  },
});
