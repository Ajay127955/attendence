import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Deploy path. Use "/attendence/" to publish at
  // https://codestorm.dpdns.org/attendence/ — leave empty for the site root.
  const base = env.VITE_BASE_PATH || '/';

  return {
    base,
    plugins: [react()],
    server: {
      port: 5173,
      // Dev proxy so the browser talks to the same origin (cookies just work).
      proxy: {
        '/api': {
          target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000',
          ws: true,
          changeOrigin: true,
        },
      },
    },
    preview: { port: 4173 },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 900,
      rollupOptions: {
        output: {
          manualChunks: {
            react: ['react', 'react-dom', 'react-router-dom'],
            charts: ['recharts'],
          },
        },
      },
    },
  };
});
