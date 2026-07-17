# Sprint 2 report — Poppy: kinematics + the Boing Boot

**Commit:** `Sprint 2: player kinematics + boing boot`
**Date:** 2026-07-16

## GATE A — resolved to default

**Keyboard-only.** `src/lib/input.ts` is the device seam: a framework-free
action state (`left/right/jump/boing` held flags + per-tick edge-detecting
`sample()`). The keyboard adapter (`src/input-keyboard.ts`, browser side)
writes the flags; a gamepad adapter can be added later without touching the
sim. Bindings: arrows move, **Ctrl** jumps, **Alt** toggles the boot (the
classic feel), plus **Z/X** aliases because browsers love stealing Alt.
F1 still toggles the debug overlay.

## What shipped

- `src/lib/player.ts` — run accel/decel with skid (reversing decelerates
  ~30% harder than accelerating), coyote time (~80 ms; constant is 0.09 s —
  see code comment on decrement ordering), jump buffering (100 ms),
  variable jump height (release while rising cuts vy to 40%). **Boing Boot:**
  Alt toggles; in boot mode landings never settle — a small auto-bounce
  (~25 px) keeps the spring alive, and holding jump at contact springs
  ~79 px, right at 2× the normal 39 px jump. Momentum carries in air (zero
  air drag in boot mode). Toggling the boot while standing self-starts a
  small bounce. Spikes kill; death pauses 0.6 s then the game respawns.
- `src/lib/game.ts` — sim-side game state: level + player + **lives (3)**.
  Death → respawn at `P`, one life lost. Lives at 0 refill (flagged
  placeholder — the real game-over → title flow is Sprint 3's contact rule
  work).
- `src/lib/input.ts` — the GATE A seam (above).
- Poppy sprite in `src/lib/art.ts` — five 16×16 embedded pixel-array frames:
  idle, run×2, jump, boing (red boot spring visible). Yellow hair, white
  face, light-blue overalls. `render.ts` bakes right- and left-facing
  copies at boot; frame choice reads sim state only. Death = blink.
- `src/main.ts` rewired to `createGame`/`updateGame` + input sampling once
  per fixed tick. Debug overlay now also shows lives + mode.

## What you need to do once

Nothing. `npm run dev` → arrows run, Ctrl/Z jumps, Alt/X toggles the boot.

## What's deferred

- Game-over screen (Sprint 3). Lives currently refill at 0.
- HUD (Sprint 4) — lives/mode readout lives in the F1 overlay meanwhile.

## Verification

`npm run verify:2` (plain Node, scripted input against `updateGame`):

| check | result |
|---|---|
| normal jump apex | 37.0 px (window 34–44) ✓ |
| big boing apex, jump held at contact | 75.8 px ≈ 2× ✓ |
| coyote jump 67 ms after ledge | fires ✓ |
| jump 133 ms after ledge | correctly dead ✓ |
| buffered press mid-fall | fires on landing ✓ |
| early-release cut apex | 22.7 px (< 30) ✓ |
| 3-tile gap, flat-footed run-jump | clears ✓ |
| 5-tile gap, boot + held jump | clears ✓ |
| spike death → −1 life → respawn at P | ✓ |

Feel pass in browser (:5179): ran right, cleared the crash-crater wall with
a normal jump, landed on the lip; toggled the boot and big-bounced across
the mid-level ledges — spring frame draws under her boots, camera tracks,
skid/turnaround feels snappy, no float. `npm run build` clean.

## Divergences / fixes flagged

- **Physics bug found & fixed while verifying:** a body whose feet landed
  *exactly* on a tile boundary (common at 60 Hz with round velocities)
  missed the collision by an epsilon, so `landed` never fired and the boing
  chain died. Downward sweep now treats touching as landing; the redundant
  "standing probe" that was masking the bug is deleted. `verify:1` re-run
  green after the change.
- Coyote constant is 0.09 s to net the brief's ~80 ms after tick ordering
  (documented in `player.ts`).
- Z/X key aliases added alongside Ctrl/Alt (browser Alt behavior), noted
  above.
