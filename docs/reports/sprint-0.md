# Sprint 0 report — Scaffold, loop, palette

**Commit:** `Sprint 0: scaffold, fixed-timestep loop, EGA palette`
**Date:** 2026-07-16

## What shipped

- Vite vanilla-TS scaffold, hand-rolled (no `create-vite` wizard — same file
  set, no interactive prompts). **Versions pinned exact: vite 8.1.5,
  typescript 5.9.3** (latest TS is 7.x; brief pins 5.9.x, so 5.9.3 it is).
  Node 22.18.0 on the build machine.
- `vite.config.ts` — dev port **5179** with `strictPort` so it fails loud
  instead of drifting onto a claimed port.
- `src/lib/palette.ts` — the 16 EGA colors as a `const` tuple, `PaletteIndex`
  union type, named `EGA.*` indices, `colorOf()`. Framework-free, stated in
  the header. Mirrored as `--ega-0`…`--ega-15` in `src/tokens.css`.
- `src/lib/loop.ts` — fixed-timestep accumulator (60 Hz update, rAF render),
  framework-free. Takes `update(dt)` / `render(alpha)` callbacks; `frame(now)`
  is directly drivable from Node for verification. 0.25 s frame-delta clamp so
  a hidden tab doesn't spiral into thousands of catch-up ticks.
- `src/main.ts` — 320×200 canvas, integer scaling (largest whole multiple
  that fits), `image-rendering: pixelated`, letterboxed on `--ega-0` black.
  Proof scene: bouncing 16×16 square cycling all 16 palette colors, 0.25 s per
  color.
- `tsconfig.json` includes `erasableSyntaxOnly` — this is what guarantees
  `lib/` stays runnable under Node's `--experimental-strip-types` (no enums,
  no parameter properties can creep in; the compiler enforces the contract).
- `RUNBOOK.md` (port claim, commands), `BUILD_BRIEF.md` (standing brief
  extracted from the master plan), `.env.example` (one line: no env vars),
  `vercel.json` (catch-all rewrite), `docs/reports/`.

## What you need to do once

- Nothing yet. `npm install` then `npm run dev` → http://localhost:5179.
- When you want it public: `vercel` in the repo root (framework Vite, build
  `npm run build`, output `dist/` — all in vercel.json/RUNBOOK).

## What's deferred

- Everything gameplay: tiles (Sprint 1), Poppy (Sprint 2), critters (3),
  pickups/HUD (4), level chain (5), juice (6).
- GATE A (input map) resolves at Sprint 2; GATE B (overworld) at Sprint 5.

## Verification

- `npm run verify:0` — plain-Node import of `loop.ts` + `palette.ts` (no DOM
  errors), 16 unique well-formed colors, and the timestep invariant: 2
  simulated seconds fed as smooth 60 fps, throttled 20 fps, and jittery
  frame cadences all produce exactly 120 updates; render alpha always in
  [0,1); a 10 s stall clamps to 15 updates instead of 600. **ALL PASS.**
- `npm run build` — tsc + vite build clean (2.24 kB JS gzipped 1.13 kB).
- Browser check on :5179 — square bounces smoothly, cycles colors (verified
  yellow → magenta across captures), canvas integer-scaled 3× at 1280×720
  with black letterbox. The devtools "6× CPU throttle" check was covered by
  the Node 20 fps-cadence test above (same invariant: update count is
  wall-clock-locked, not frame-locked); noting this as a mild divergence in
  method, not in what was proven.

## Divergences

- **Repo location:** brief says `E:\git\BOING`; the brief itself was dropped
  at `E:\git\CommanderKeen-Poppy`, so the build lives there and pushes to
  `github.com/jpetree331/game-poppy-sprocket`. Package name is
  `poppy-sprocket`. Flagging the folder name: per divergence rule 1 (original
  IP only), nothing *inside* the repo references the folder's namesake — the
  folder is just where the brief landed.
- **TypeScript 5.9.3, not latest (7.x):** per the brief's explicit pin.
- `.claude/launch.json` added (dev-tooling convenience for browser
  verification; not part of the game).
