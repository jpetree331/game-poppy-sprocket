# Poppy Sprocket in: *Marooned on Murkk-7* — Master Build Plan (codename: BOING)

A love letter to 1990-era EGA platformers. Original hero, original aliens, original
everything — the *bones* are the homage: 16-color palette, chunky tiles, a kid
genius stranded on a weird gray planet, four scattered ship parts, and a
spring-loaded boot that goes *boing*.

**Premise:** Poppy Sprocket (age 8¾, junkyard prodigy) built a rocket out of a
wheelbarrow, a decommissioned water heater, and 47 soda bottles. A meteor shower
over planet Murkk-7 knocked four parts loose: the **Sputter Coil**, the **Fizz
Tank**, the **Left Fin**, and the **Big Red Button**. Recover all four, get home
before dinner.

---

## Locked decisions (do not relitigate)

- **Vite + vanilla TypeScript + Canvas 2D. No React.** Deliberate divergence
  from the product-app default: a fixed-timestep game loop and React's render
  model fight each other. The menu shell is plain DOM styled with token CSS.
- **Versions pinned at scaffold:** Vite 8.x, TypeScript 5.9.x. Note exact
  versions in the Sprint 0 report.
- **Fixed timestep:** 60 Hz simulation via accumulator, `requestAnimationFrame`
  render, interpolation optional (seam only, Phase 3).
- **EGA 16-color palette, hard-locked.** The palette is a hardware spec, not
  anyone's IP. Defined once in `src/lib/palette.ts` and mirrored in
  `tokens.css`. No color outside the 16 appears anywhere, ever — including UI.
- **16×16 px tiles, 320×200 logical resolution**, integer-scaled to fit the
  window (nearest-neighbor, `image-rendering: pixelated`).
- **Levels are hand-editable ASCII text maps** in `/levels/*.txt`. One char =
  one tile. Legend lives in `levels/LEGEND.md`.
- **All art is procedural or embedded pixel arrays.** Sprites are small
  `number[][]` palette-index grids rendered to offscreen canvases at boot. No
  image files, no downloaded sprite sheets, nothing ripped from any game.
- **All audio is Web Audio synthesis** (square/triangle bleeps). No audio files.
- **Dev port 5179** (5173/5174/5178 are claimed). Document in RUNBOOK.md.
- **Deploy:** Vercel static SPA, minimal `vercel.json` catch-all rewrite.

## Decision gates

- **GATE A — Input map (resolve before Sprint 2):** keyboard-only
  (arrows + Ctrl jump + Alt boing, the classic feel) vs. adding gamepad.
  **Default if unresolved:** keyboard-only; leave a `src/lib/input.ts` seam so
  gamepad is additive later.
- **GATE B — Overworld map between levels (before Sprint 5):** full walkable
  overworld vs. simple level-select screen. **Default:** level-select screen;
  overworld is seam only, no implementation this phase.

---

# STANDING BRIEF (save as BUILD_BRIEF.md)

## Stack & environment
Vite 8 + vanilla TypeScript 5.9 + Canvas 2D. Windows 11, repo at
`E:\git\BOING`. Dev port **5179**. Deploy target: Vercel (static). No backend,
no database, no env vars beyond Vite defaults — commit a one-line
`.env.example` saying exactly that so nobody goes hunting.

## The autonomy clause (applies to every sprint)
Work autonomously to completion. Do not stop to ask for confirmation on
reversible implementation choices — pick the sound default, note it in your
summary, and keep going. Never: change the locked stack, add paid services, add
runtime dependencies beyond Vite/TS toolchain, or introduce external asset
files without flagging.

## The Recon → Build → Verify contract
Every sprint runs RECON (read before writing), BUILD, VERIFY (do this, don't
skip), and reports divergences from the plan. Reports land at
`docs/reports/sprint-N.md` with sections: What shipped / What you need to do
once / What's deferred / Verification. Commit messages map 1:1 to sprints:
`Sprint 2: player kinematics + boing boot`.

## Divergence rules (do NOT break these without flagging)
1. **Original IP only.** No names, sprites, sound motifs, or level layouts from
   Commander Keen or any other game. The homage is structural (EGA palette,
   tile platforming, collect-the-ship-parts arc) — never literal. If a
   generated name or design lands too close to an existing game, rename it and
   note the rename in the sprint report.
2. **All simulation code lives in `src/lib/` and is framework-free** — no DOM,
   no Canvas, no Vite imports. `lib/` must run in plain Node. Say so in file
   headers. Rendering reads sim state; it never mutates it.
3. **Every color is a palette index.** Functions take `PaletteIndex`, not hex
   strings. The only hex literals in the repo are the 16 in `palette.ts` and
   `tokens.css`.
4. **Levels stay hand-editable.** No binary level formats, no JSON levels. If a
   feature needs per-tile metadata, extend the ASCII legend.
5. **Fixed timestep is sacred.** No physics in the render callback. Ever.

## Schema (source of truth — level legend sketch, adapt idiomatically)
```
LEGEND (levels/LEGEND.md)
#  solid block          =  platform (jump-through from below)
.  empty                ^  spike hazard (kills)
P  player spawn         E  level exit door
g  Globbin (hopper)     p  Prickle-Pig (patroller)
j  Janitor-Bot (turret) *  soda-cap pickup (100 pts)
K  keycard              D  locked door (consumes K)
1..4 ship part (Sputter Coil, Fizz Tank, Left Fin, Big Red Button)
```

## Guardrails carried throughout
- Zero external assets — everything drawn/synthesized in code (this is the
  security stance AND the copyright stance).
- `lib/` stays Node-runnable so `scripts/verify-sprintN.mjs` spot-checks work.
- Death is never a hard fail: respawn at level start, lose one of 3 lives,
  game-over screen returns to title. Nothing punishing — this is a kid's game.

---

# PHASE 1 — ENGINE

## Sprint 0 — Scaffold, loop, palette
### RECON
Fresh repo. Confirm nothing exists at `E:\git\BOING`. Check `npm view vite
version` and pin exactly what you get.
### BUILD
- Scaffold Vite vanilla-ts. Pin versions. Set dev port 5179 in `vite.config.ts`.
- `src/lib/palette.ts`: the 16 EGA colors as a `const` tuple + `PaletteIndex`
  type. Mirror into `src/tokens.css` as `--ega-0` … `--ega-15`.
- `src/lib/loop.ts`: fixed-timestep accumulator (60 Hz update, rAF render),
  framework-free — it takes `update(dt)` and `render(alpha)` callbacks.
- `src/main.ts`: 320×200 canvas, integer scaling, `image-rendering: pixelated`,
  letterboxed on `--ega-0` black.
- Prove it: render a bouncing 16×16 square cycling through all 16 colors.
- `RUNBOOK.md`: port claim, run commands. `docs/reports/` dir.
### VERIFY (do this, don't skip)
- `npm run dev` on :5179; square bounces smoothly; throttle CPU 6× in devtools —
  motion speed unchanged (timestep works).
- `node -e "import('./src/lib/loop.ts')"`-style check via a tiny
  `scripts/verify-sprint0.mjs`: loop and palette import in plain Node with no
  DOM errors.

## Sprint 1 — Tilemap + collision
### RECON
Read `loop.ts`, `palette.ts`, LEGEND sketch in BUILD_BRIEF.
### BUILD
- `src/lib/level.ts`: parse ASCII maps → typed tile grid + entity spawn list.
- `src/lib/physics.ts`: AABB vs. tile-grid collision (swept, axis-separated),
  gravity, `=` platforms passable from below. Framework-free.
- `levels/01-crash-site.txt`: first real map — crash crater, some ledges, no
  enemies yet.
- Tile renderer: solid blocks, platforms, spikes drawn from pixel arrays.
- Debug overlay toggle (F1): tile grid + AABBs.
### VERIFY
- `scripts/verify-sprint1.mjs`: in plain Node, drop a test AABB onto a parsed
  map, assert it lands on the expected row; assert `=` blocks from above but
  not below.
- In browser: walk-through with a gravity-only dummy box; no tunneling at 6×
  CPU throttle.

## Sprint 2 — Poppy: kinematics + the Boing Boot
### RECON
Read `physics.ts`. Resolve GATE A or take the default (keyboard-only).
### BUILD
- `src/lib/player.ts`: run accel/decel with slight skid, coyote time (~80 ms),
  jump buffering, variable jump height (release = cut).
- **Boing Boot mode** (Alt toggles): continuous bouncing; holding jump at
  contact = big bounce, ~2× jump height. Momentum carries in air.
- Poppy sprite: embedded pixel-array frames — idle, run×2, jump, boing. Yellow
  hair, red boot spring. Facing flip.
- Spikes kill → respawn at `P`, lives counter in sim state (HUD is Sprint 4).
### VERIFY
- Feel pass, in browser, recorded in the report: can you clear a 3-tile gap
  flat-footed? A 5-tile gap on the boot? Coyote-time jump off a ledge edge?
- `verify-sprint2.mjs`: simulate 600 fixed ticks of a scripted jump in Node;
  assert apex height within expected range for both normal and boing jumps.

# PHASE 2 — GAME

## Sprint 3 — Critters + consequences
### RECON
Read `player.ts`, `level.ts` entity spawning.
### BUILD
- `src/lib/enemies.ts`: **Globbin** (hops toward Poppy, harmless to touch from
  above — squish), **Prickle-Pig** (ledge-aware patroller, lethal on contact),
  **Janitor-Bot** (stationary, lobs slow soap bubbles that pop on tiles).
- Contact rules, squish scoring, death/respawn flow, 3 lives, game-over →
  title placeholder.
- `levels/02-suds-canyon.txt` featuring all three critters.
### VERIFY
- `verify-sprint3.mjs`: Node-simulate a Prickle-Pig on a 3-tile ledge for 1200
  ticks; assert it never walks off. Assert Globbin squish sets its dead flag.
- Browser: die on purpose 3×; game-over fires; lives reset on restart.

## Sprint 4 — Pickups, keycards, HUD
### RECON
Read LEGEND; check which chars are still unimplemented (`*`, `K`, `D`, `1-4`).
### BUILD
- Soda-cap pickups (100 pts), keycard → locked door consumption, the four ship
  parts as distinct 16×16 sprites with a sparkle animation (2-frame).
- HUD strip in the bottom 16 px: score, lives, keycard icon, 4 ship-part slots
  that fill as parts are found across levels (persist in a run-state object,
  sim-side).
- `levels/03-the-drippy-depths.txt`: first keycard puzzle.
### VERIFY
- `verify-sprint4.mjs`: Node run-state test — collect part 2, assert slot 2
  filled and persists across a level load.
- Browser: keycard opens door exactly once; score updates; HUD stays inside
  320×200.

## Sprint 5 — Exit chain + win state
### RECON
Resolve GATE B or take the default (level-select screen). Read run-state code.
### BUILD
- `E` exit door → level-select screen (5 level slots; slot shows ✓ and which
  ship part it held). Overworld remains **seam only, no implementation this
  phase** — leave the interface, label it in code comments.
- `levels/04` + `levels/05` (one part per level across 02–05; level 01 is a
  tutorial with none… or hide part 1 in a sneaky spot above the crash — your
  call, note it).
- Win state: all four parts → launch cutscene rendered in-engine (rocket
  reassembles, sputters, blasts off, "SEE YOU AFTER DINNER" card).
### VERIFY
- Full playthrough, all five levels, recorded in the report with rough
  completion time. Win cutscene reachable. Game-over → title → fresh run-state.

# PHASE 3 — JUICE

## Sprint 6 — Title, bleeps, dust
### RECON
Read everything in `src/lib/` headers; confirm no DOM imports crept in.
### BUILD
- Title screen: big pixel-text logo drawn from arrays, palette-cycling border,
  "PRESS JUMP TO START", tiny attract-mode demo loop (optional — flag if
  skipped).
- `src/audio.ts` (NOT in lib/ — it touches Web Audio): square-wave jump/boing/
  pickup/squish/death bleeps, a 4-bar triangle-wave title jingle. Original
  melody — nothing quoted from any game soundtrack.
- Particles: landing dust puffs, squish stars, part-collect sparkle burst. All
  palette-indexed.
- Screen transitions: EGA-style wipe between levels.
### VERIFY
- Mute toggle (M) works; no audio starts before first user input (autoplay
  policy). Particles never exceed palette. Vercel deploy preview plays start
  to finish on desktop + one phone (touch is out of scope — just confirm it
  doesn't crash).

## Sprint 7 (aspirational — seam only unless Jess green-lights)
In-browser level editor writing the ASCII format back out, and the walkable
overworld from GATE B. Do not build in this plan; list both in the final
report under "What's deferred."
