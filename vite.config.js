import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // cubing loads its solver in a web worker and fetches WebAssembly beside
    // it. Vite's dep pre-bundling rewrites those paths and the worker entry
    // goes missing, which breaks Solve in dev.
    exclude: ['cubing'],
  },
  build: {
    rollupOptions: {
      output: {
        /*
         * Keep Vite's dynamic-import preload helper out of the app entry.
         *
         * cubing finds its worker by importing its own worker-entry chunk and
         * reading `import.meta.url`, then spawning that file as a module
         * worker. The entry uses a dynamic import, so it needs the preload
         * helper — and by default the helper lives in the app's entry chunk,
         * so the worker began `import "./index-*.js"`. That runs main.jsx
         * inside the worker, where `document` does not exist, and the worker
         * dies before it can answer: Solve hangs in production while dev,
         * which serves cubing unbundled, is fine.
         *
         * Giving the helper its own chunk leaves the worker importing nothing
         * but cubing.
         */
        manualChunks(id) {
          if (id.includes('vite/preload-helper')) return 'preload-helper';
        },
      },
    },
  },
});
