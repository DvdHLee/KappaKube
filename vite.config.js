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
    /*
     * Keep Vite's dynamic-import machinery out of cubing's worker.
     *
     * cubing spawns its solver as a module worker whose entry uses a dynamic
     * import. Vite rewrites those through its `__vitePreload` helper, which
     * exists to inject `<link rel=modulepreload>` tags — so the worker ended up
     * running `document.getElementsByTagName(...)` in a context that has no
     * `document`, and died before it could answer. Solve simply hung. Dev never
     * showed it, because there cubing is served unbundled and untouched.
     *
     * Two settings between them leave the worker importing nothing that needs a
     * DOM: `modulePreload: false` empties the helper's dependency list (it does
     * nothing at all when there is nothing to preload), and splitting the
     * helper into its own chunk stops it dragging the whole app entry — React,
     * three.js and main.jsx's `createRoot` — in behind it.
     */
    modulePreload: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('vite/preload-helper')) return 'preload-helper';
        },
      },
    },
  },
});
