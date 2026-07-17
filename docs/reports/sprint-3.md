# Sprint 3 report — Critters + consequences

**Commit:** `Sprint 3: enemies + death/respawn flow`
**Date:** 2026-07-16

## What shipped

- `src/lib/enemies.ts` — the three critters, framework-free:
  - **Globbin** — pauses ~0.8 s, then hops toward Poppy. Harmless from
    above: a stomp squishes it (flatten frame lingers 0.4 s, then gone).
  - **Prickle-Pig** — patrols at 40 px/s, turns at walls *and* ledge edges
    (probes the tile ahead-and-below each tick). Lethal on contact from any
    direction — the quills win.
  - **Janitor-Bot** — stationary sentry; every 2.5 s lobs a slow soap
    bubble (low-gravity arc) toward Poppy. Bubbles pop on any tile, or
    after 6 s. Bubble contact hurts. The bot itself is squishable from
    above — a stomp disables a robot (brief left it unspecified; chose
    squishable and flagging it here).
- Contact rules in `game.ts`: falling + mostly-above = squish (+200 pts,
  stomp rebound); anything else = hurt. Death → 0.6 s pause → **level
  entities fully reset, respawn at P, −1 life**. At 0 lives:
  `phase = "gameover"`, GAME OVER card, jump starts a fresh run (lives 3,
  score 0). Score lives in sim state.
- `levels/02-suds-canyon.txt` — 64×12, all three critters: spike pit off
  the spawn (jumpable flat-footed), Prickle-Pig patrolling the west girder
  platform, two Globbins on the canyon floor, Janitor-Bot lobbing from a
  floating scrap block with a girder route over it.
- Enemy pixel-array sprites (Globbin + squished, Prickle-Pig walk×2,
  Janitor-Bot + squished, 8×8 soap bubble), mirrored bakes, render in
  `render.ts`.
- Dev nicety: `?level=2` URL param boots a later map until the Sprint 5
  level chain exists.

## What you need to do once

Nothing. `npm run dev` → http://localhost:5179/?level=2 to meet everyone.

## What's deferred

- Pickups/keycards/HUD → Sprint 4 (score displays only in the F1 overlay).
- Real title screen → Sprint 6 (game-over card is canvas-font placeholder;
  Sprint 6 replaces lettering with pixel arrays).

## Verification

`npm run verify:3` (plain Node):

| check | result |
|---|---|
| Prickle-Pig on a 3-tile ledge, 1200 ticks | never left, 24 turns ✓ |
| stomp Globbin | dead flag, +200, rebound, Poppy unharmed ✓ |
| walk into Globbin | dies ✓ |
| 3 deaths | exactly 2 respawns then game over ✓ |
| jump at game over | fresh run: 3 lives, 0 score, critters back ✓ |
| Janitor-Bot | lobs within window; bubble pops on tiles ✓ |
| level 02 file | parses 64×12 with all critters + exit ✓ |

Browser (:5179/?level=2): all three critters render and behave (pig
patrolling its girder, Globbin idle-hopping, bot off-screen east). Died on
purpose 3× on the spawn spike pit — death blink, respawns, then the GAME
OVER card; jump restarted a fresh run with enemies restored. Captured at
each stage. `npm run build` clean.

## Divergences

- Janitor-Bot squishability chosen (unspecified in brief) — noted above.
- Game-over card uses canvas monospace text as a placeholder — flagged for
  replacement by pixel-array lettering in Sprint 6.
