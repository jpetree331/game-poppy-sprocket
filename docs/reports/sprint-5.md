# Sprint 5 report — Exit chain + win state

**Commit:** `Sprint 5: exit chain + win state`
**Date:** 2026-07-16

## GATE B — resolved to default

**Level-select screen.** The walkable overworld is **seam only**: an
`OverworldSeam` interface stub sits at the bottom of `src/lib/campaign.ts`,
labeled in comments, deliberately unimplemented.

## What shipped

- `src/lib/campaign.ts` — framework-free level chain: select → level →
  exit → ✓'d slot → select … → all four parts → launch cutscene → card →
  fresh run. Game over inside any level returns to select with a fresh run
  (death is never a hard fail). Part-per-level map is derived from each
  level's spawn list, so the select UI never lies about which slot held
  what.
- `E` exits are live: walking into an exit door fires `exitReached`
  (rects built at `createGame`), the campaign marks the slot ✓.
- **Select screen**: title, five slots (2× pixel-digit number, green
  pixel-check when completed, colored part chip once its part is home),
  cursor with wrap on left/right (edge-detected inputs added to the input
  seam), run score. Slot names use canvas font as placeholder — Sprint 6's
  pixel lettering replaces them.
- **Win cutscene, rendered in-engine**: the reassembled rocket (new 16×32
  pixel-array sprite — Big Red Button nose, Fizz Tank band, red fins,
  Sputter Coil engine) sputters on the pad with a shake, fires with an
  animated flame, lifts off quadratically, then the **"SEE YOU AFTER
  DINNER"** card. Jump is locked out for 7 s so the moment lands; then it
  returns to a fresh run.
- **Levels 04 + 05**: `04-boing-gulch.txt` (60×14) — boot-mandatory
  terraces (ground → mid-step → high pillar, computed against the 79 px
  big-boing apex), a Prickle-Pig sealed in a pillar pocket, spike strips
  under the flight path, Left Fin on the summit. `05-the-static-summit.txt`
  (64×14) — finale: keycard on the west girders (boot required), all three
  critters, spike strip, 2-tall door sealing the Big Red Button and the
  last exit.
- **Part placement across the game** (the brief left level 01's sneaky
  part 1 to my call): went with the clean read — **level 01 is a pure
  tutorial with no part; parts 1–4 live in levels 02–05 respectively**
  (Sputter Coil above Suds Canyon's east girder, Fizz Tank behind the
  Drippy Depths door, Left Fin on Boing Gulch's summit, Big Red Button
  behind the Static Summit door).
- Dev shortcuts: `?level=N` still boots a lone level; `?win=1` jumps to
  the cutscene.

## What you need to do once

Nothing. `npm run dev` → the select screen is the front door now.

## What's deferred

- Title screen, pixel lettering, audio, particles, wipes → Sprint 6.
- Overworld + level editor → Sprint 7 (seam listed, not built).

## Verification

- `npm run verify:5` (plain Node): cursor moves/wraps; **full chain over
  five synthetic levels — every slot ✓'d, parts 1–4 collected, win state
  fires exactly on the final exit**; cutscene ignores jump until the 7 s
  lock, then resets to a fresh run with slots and parts cleared; run score
  persists across the chain; in-level game over returns to a fresh run;
  shipping levels all parse with exits, level 01 partless, parts 1–4
  exactly once across 02–05. **ALL PASS.** `npm run build` clean.
- Browser: select screen renders (title, slots, cursor); `?win=1` cutscene
  observed at all three stages (pad sputter, flame liftoff, card + PRESS
  JUMP); **and a real playthrough of level 01 through the campaign**: a
  deterministic input plan found in the sim (exit at 16.4 s, 0 deaths —
  boing east, boot off at the wall, walk back to the door) was replayed
  live; the game returned to select with slot 1 checked. Screenshot
  evidence at each stage.
- Rough completion time, scripted proxy: level 01 in ~16 s. A full-game
  human playthrough (levels 02–05 have live critters that punish
  open-loop scripts) is the one verify item left to actual hands —
  flagged rather than faked. Every level's completability constraints
  were computed against jump/boing apexes at design time, and the chain
  logic is fully sim-verified.

## Divergences

- Level 01 sneaky part option declined (noted above) — one part per level
  across 02–05 keeps the select-screen story honest.
- Select/cutscene text still canvas-font placeholders (flagged since
  Sprint 3; Sprint 6 owns lettering).
