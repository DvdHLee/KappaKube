# KappaKube

A visual Rubik's Cube algorithm teacher. React + three.js, frontend only.

See [PLAN.md](PLAN.md) for the architecture and phase plan.

## Getting started

```bash
npm install
npm run dev      # http://localhost:5173
```

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the core test suite once |
| `npm run test:watch` | Watch mode |
| `npm run coverage` | Coverage report for `src/core` |
| `npm run lint` | ESLint |
| `npm run format` | Prettier, write |

## Layout

```
src/
  core/     pure cube model, moves and notation - no React, no three.js, fully tested
  three/    the 3D scene
  ui/       DOM overlay
  theme.js  every colour and dimension
```

The hard boundary at `src/core` is deliberate: it has no rendering dependencies,
which is what keeps the model size-agnostic and the maths testable in isolation.

## Deploying

Vercel auto-detects Vite - no configuration needed. Point a project at this repo,
or run `npx vercel`.
