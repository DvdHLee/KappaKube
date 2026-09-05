import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // cubing loads its solver in a web worker and fetches WebAssembly beside
    // it. Vite's dep pre-bundling rewrites those paths and the worker entry
    // goes missing, which breaks Solve in dev while the production build is
    // fine. Leaving it unbundled keeps the two consistent.
    exclude: ['cubing'],
  },
});
