# Sprint 6 report — Title, bleeps, dust (Phase 3: JUICE)

**Commit:** `Sprint 6: title screen, audio, particles, transitions`
**Date:** 2026-07-16

## RECON result

Confirmed rule 2 the hard way before building: grepped `src/lib/` for
DOM/Canvas/Audio identifiers (nothing but the word "window" in a prose
comment) — and then made the check permanent: `verify:6` imports **all 12
lib modules in plain Node** and re-greps lib for DOM/Canvas/Audio APIs on
every run. Rule 3 got the same treatment: a scanner asserts hex literals
exist only in `palette.ts` + `tokens.css`.

## What shipped

- **Title screen** — big POPPY SPROCKET logo in pixel lettering (scale-4
  glyphs), palette-cycling 3 px border, blinking "PRESS JUMP TO START",
  control hints. Campaign now boots at `title`; game over and the win card
  both return here (per the Sprint 3 brief note). The **attract-mode demo
  loop was skipped** — flagged as the brief allows.
- **Pixel typeface** — 3×5 uppercase A–Z + punctuation in `art.ts`
  (`FONT`), joined with the digits; `drawText` in render.ts bakes glyphs
  per (char, color) with scaling. **Every string in the game now uses it**
  — the canvas-font placeholders from Sprints 3–5 (game-over card, select
  screen, win card) are gone. `verify:6` proves the font covers all 20
  in-game strings.
- **`src/audio.ts`** (deliberately NOT in lib/ — it touches Web Audio):
  square-wave jump / boing (small & big) / pickup / keycard / squish /
  death / door bleeps, a part-collect fanfare, level-done and game-over
  stings, a launch rumble, and a **4-bar triangle-wave title jingle —
  original melody, quotes nothing**. The AudioContext is created lazily on
  the first keydown/pointerdown, so no audio can start before user input
  *by construction*. **M toggles mute** with a red MUTE indicator on
  screen.
- **Particles** (`lib/particles.ts`, framework-free): landing dust puffs,
  squish stars, part-collect sparkle bursts, a gentle death poof. Every
  particle carries a `PaletteIndex`; `verify:6` asserts palette discipline
  and full expiry.
- **Screen transitions** — EGA-style staggered curtain wipe on level start
  and level complete.
- Event → juice wiring lives in `main.ts`: sim events (jumped, boinged,
  landed, squished, collected, died, won…) fan out to sfx + particle
  spawns. Rendering still never mutates sim state.

## What you need to do once

- **Deploy:** `vercel` from the repo root (config is all in `vercel.json` /
  RUNBOOK — framework Vite, `npm run build`, `dist/`). I don't have your
  Vercel credentials, so the deploy-preview + phone smoke test is yours;
  local phone-viewport check passed (below).

## What's deferred (Sprint 7 — per the brief, listed, not built)

- **In-browser level editor** writing the ASCII format back out.
- **Walkable overworld** (GATE B seam — `OverworldSeam` stub in
  `campaign.ts` marks the socket).
- Attract-mode demo loop on the title (flagged skip, above).

## Verification

- `npm run verify:all` — **all seven suites green** (0–6), including the
  new guardrails: lib purity, hex-literal rule, particle palette + expiry,
  title flow (title → select → game over → title), font coverage,
  synthesis-only audio.
- `npm run build` clean. Whole game: 38.8 kB JS (11.8 kB gzipped).
- Browser: title screen verified (logo, cycling border, blink); jump
  chains title → select → level with the curtain wipe; **M shows the red
  MUTE indicator**; played a stretch of level 1 with jumps/landings
  (dust is sim-tested; a 0.3 s puff outruns my screenshot finger).
  Audio is synthesized on real key events — the autoplay rule holds by
  construction (context exists only after a gesture); the bleeps
  themselves want human ears, flagged for your first playthrough.
- **Mobile check:** 375×812 viewport renders the game integer-scaled at
  1×, centered, no crash. Touch input is out of scope per the brief.

## Divergences

- Attract mode skipped (allowed + flagged).
- Sprint 2's Z/X key aliases got promoted to the title-screen hint text
  alongside Ctrl/Alt… actually the hint names Ctrl/Alt (the classic feel);
  Z/X remain as quiet aliases.
- `verify:5` expectations updated for the title screen (game over → title
  instead of → select).
