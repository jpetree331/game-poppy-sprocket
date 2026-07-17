# RUNBOOK — Poppy Sprocket in: Marooned on Murkk-7

## Port claim

Dev server runs on **:5179** (`strictPort` — it will fail rather than drift).
5173/5174/5178 are claimed by other local projects.

## Commands

```
npm install        # once
npm run dev        # dev server at http://localhost:5179
npm run build      # typecheck (tsc --noEmit) + production build to dist/
npm run preview    # serve the production build locally
npm run verify:0   # Sprint 0 spot-checks (plain Node, no browser)
```

Verify scripts run `src/lib/*.ts` directly in Node via
`--experimental-strip-types` (Node 22.6+; built on Node 22.18). `lib/` is
framework-free by contract — no DOM, no Canvas, no Vite imports — which is
what makes this possible.

## Deploy

Vercel static SPA: framework Vite, build `npm run build`, output `dist/`.
`vercel.json` carries the catch-all rewrite. No env vars, no backend.
