# Sprint 4 report — Pickups, keycards, HUD

**Commit:** `Sprint 4: pickups, keycards, HUD`
**Date:** 2026-07-16

## What shipped

- **Locked doors are tiles now** (`TILE.door`): `D` parses into the grid,
  blocks exactly like solid in all directions, and unlocks via a 4-neighbor
  flood so a 2-tall door opens with one keycard. Unlock trigger: keycard in
  hand + player within 1 px of a door tile. The card is consumed — opens
  exactly once.
- `src/lib/items.ts` — soda caps (100 pts), keycard, ship parts as static
  AABB collectibles with overlap collection.
- **Run-state** (`RunState` in `game.ts`): score, lives, and the four
  ship-part flags now live in an object that **persists across level
  loads** — `createGame(text, run)` threads it through; Sprint 5's level
  chain just keeps passing it. Parts award 1000 pts and fill their slot.
  Death keeps collected items and score (kid-friendly); a fresh run after
  game over re-parses the level, so opened doors re-lock and items respawn.
- **The four ship parts** as distinct 16×16 pixel-array sprites: Sputter
  Coil (copper windings), Fizz Tank (cyan bottle), Left Fin (red swept fin),
  Big Red Button (exactly that). Two-frame sparkle overlay on uncollected
  parts.
- **HUD strip in the bottom 16 px** (stays inside 320×200): soda-cap icon +
  6-digit score, mini-Poppy + lives count, keycard indicator when held, and
  four right-aligned part slots that fill with a color-coded numbered chip.
  Lettering is a 3×5 pixel-array digit font — no browser fonts.
- `levels/03-the-drippy-depths.txt` — 56×14 sealed cavern: keycard on a
  guarded ledge, 2-tall locked door walling off the exit corridor (the wall
  above it runs to the ceiling, so the boot can't cheat over), Prickle-Pig +
  Globbin on the floor, soda-cap scenic climb up the girder platforms.

## What you need to do once

Nothing. `npm run dev` → http://localhost:5179/?level=3 for the puzzle.

## What's deferred

- Exit doors still don't exit — Sprint 5 wires `E` → level select → chain.
- Part placement across shipping levels (Sprint 5); collection logic and
  persistence are fully built and tested now.

## Verification

`npm run verify:4` (plain Node): caps score 100 each; keycard picked up en
route opens the 2-tall door on touch (both tiles cleared), card consumed;
without a card the door stops the player cold; part 2 → slot 2 filled +
1000 pts and **persists across a level load with the same RunState**;
collected items survive an in-level death and score is kept; after game
over a fresh run re-locks doors and clears parts/items; shipping level 03
parses with K + 2-tall D. **ALL PASS.** `npm run build` clean. Sprints 1–3
suites re-run green (physics door changes are additive).

Browser (:5179/?level=3): HUD renders inside the frame with score, lives,
part slots; keycard pickup lights the HUD icon and removes the world
sprite; door tiles draw with the red key-slot art; critters + death +
game-over flow all live. Caveat, honestly: I did not *watch* the door
vanish in-browser — my scripted speedruns kept feeding Poppy to the
Prickle-Pig before the camera reached the door (the last run's consumed
keycard suggests she did open it off-camera). The open-exactly-once
behavior is pinned by the Node suite; a human with actual hands will
clear it trivially.

## Divergences

- `D` moved from entity to tile (the schema sketch listed it beside
  entities; blocking behavior makes it grid data). Legend unchanged for
  authors.
- Death keeps collected items/keycard rather than respawning them —
  chose the non-punishing reading of the guardrails; flagged here.
