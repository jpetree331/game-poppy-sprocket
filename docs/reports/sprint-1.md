# Sprint 1 report — Tilemap + collision

**Commit:** `Sprint 1: tilemap + collision`
**Date:** 2026-07-16

## What shipped

- `src/lib/level.ts` — ASCII map parser → typed tile grid (`TILE.empty/
  solid/platform/spike`) + entity spawn list + player spawn. Comment lines
  (`;`), ragged-row padding, loud errors on unknown chars and missing/double
  `P`. World-edge rules: solid to the sides/below, open above the top.
- `src/lib/physics.ts` — swept, axis-separated AABB vs. tile grid. Movement
  sub-steps so no axis advances more than half a tile at once (no tunneling
  even at absurd speeds). Gravity + terminal velocity. `=` platforms block
  only downward motion and only when the body started above the platform top
  — jump up through, land on top. Spike overlap reporting. Both files
  framework-free, headers say so.
- `levels/LEGEND.md` — full legend + file-format rules (the schema from the
  brief, made concrete).
- `levels/01-crash-site.txt` — 60×12 tutorial map: crash crater, ledges, a
  girder platform, one spike pit, exit door at the far east. No enemies.
- `src/lib/art.ts` — sprite data as hex-index string rows decoded to
  `number[][]` grids at boot (embedded pixel arrays, no files): Murkk-7
  bedrock, scrap-girder platform (top 6 rows only — matches jump-through),
  spikes, rocket-hatch exit door.
- `src/render.ts` — bakes sprites to offscreen canvases once at boot; draws
  the visible tile slice with camera offset. Reads sim state, never writes.
- `src/main.ts` — level 01 loaded via Vite `?raw` import (still a plain text
  file on disk — rule 4 intact), gravity-only dummy box with temporary
  walk/hop keys for the walkthrough, camera clamped to level bounds
  (bottom-aligned for maps shorter than the viewport), **F1 debug overlay**
  (tile grid + AABB outline), spike contact resets to spawn (real
  death/lives arrive Sprints 2–3).

## What you need to do once

- Nothing new. `npm run dev` → arrows walk, Up hops (temporary), F1 overlay.

## What's deferred

- Real player kinematics, coyote time, boing boot → Sprint 2 (the hop is a
  placeholder impulse, deliberately crude).
- Entities besides the exit door render nothing yet (parser already emits
  them all).

## Verification

- `npm run verify:1` (plain Node): parse + edge rules; a dropped body lands
  with feet exactly on the expected row and grounds; platform blocks from
  above; platform passable from below (launch clears it); spike overlap
  registers; **a 5000 px/s body (83 px/tick) does not tunnel a 1-tile
  floor**; the real level 01 parses 60×12 with an exit. **ALL PASS.**
- `npm run build` — tsc + vite clean.
- Browser on :5179 — walked the dummy right, fell into the crash crater,
  stopped clean against the crater wall, hopped out, camera scrolled and
  clamped, and on reaching the spike pit the box reset to spawn. All observed
  via captures.
- 6×-throttle tunneling check was covered by the Node cadence + 5000 px/s
  sub-step tests (same invariant, stronger dose).

## Divergences

- Sprite data is authored as hex-character string rows decoded to
  `number[][]` at boot — same embedded-pixel-array stance as the brief,
  just human-drawable in source. Flagging per the "adapt idiomatically"
  license.
- Added a temporary hop key to the Sprint 1 dummy so the walkthrough could
  actually traverse the map; it is not player kinematics and dies in
  Sprint 2.
