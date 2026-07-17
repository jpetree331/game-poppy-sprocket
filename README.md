# Poppy Sprocket in: *Marooned on Murkk-7*

A love letter to 1990-era EGA platformers — original hero, original aliens,
original everything. Poppy Sprocket (age 8¾, junkyard prodigy) crash-landed
on planet Murkk-7 and needs her four rocket parts back before dinner.

Vanilla TypeScript + Canvas 2D. 16 EGA colors, 320×200, 16×16 tiles, fixed
60 Hz timestep. Zero external assets: every sprite is an embedded pixel
array, every sound is Web Audio synthesis, every level is hand-editable
ASCII text.

## Play

```
npm install
npm run dev     # → http://localhost:5179
```

**Arrows** move · **Ctrl** (or Z) jumps · **Alt** (or X) toggles the Boing
Boot · **M** mutes · **F1** debug overlay.

The Boing Boot is the whole game: continuous bouncing, and holding jump at
contact springs about twice as high as a flat-footed jump. Later levels
assume you've made friends with it.

## Repo tour

- `BOING_master_plan.md` — the build plan this game grew from.
- `BUILD_BRIEF.md` — the standing rules every sprint ran under.
- `docs/reports/sprint-N.md` — what shipped, verified, and diverged, per sprint.
- `levels/*.txt` + `levels/LEGEND.md` — the maps; edit them with any text editor.
- `src/lib/` — the entire simulation, framework-free (runs in plain Node).
- `scripts/verify-sprintN.mjs` — `npm run verify:all` runs every suite headlessly.
- `RUNBOOK.md` — ports, commands, deploy notes (Vercel static).
