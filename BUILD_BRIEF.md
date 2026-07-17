# STANDING BRIEF — Poppy Sprocket in: *Marooned on Murkk-7* (codename: BOING)

Extracted verbatim-in-spirit from `BOING_master_plan.md`. This is the contract
every sprint runs under.

## Stack & environment

Vite 8 + vanilla TypeScript 5.9 + Canvas 2D. Windows 11. Dev port **5179**.
Deploy target: Vercel (static). No backend, no database, no env vars beyond
Vite defaults — `.env.example` says exactly that so nobody goes hunting.

Pinned at scaffold (2026-07-16): **vite 8.1.5**, **typescript 5.9.3**.

## The autonomy clause (applies to every sprint)

Work autonomously to completion. Do not stop to ask for confirmation on
reversible implementation choices — pick the sound default, note it in the
sprint summary, and keep going. Never: change the locked stack, add paid
services, add runtime dependencies beyond the Vite/TS toolchain, or introduce
external asset files without flagging.

## The Recon → Build → Verify contract

Every sprint runs RECON (read before writing), BUILD, VERIFY (do this, don't
skip), and reports divergences from the plan. Reports land at
`docs/reports/sprint-N.md` with sections: **What shipped / What you need to do
once / What's deferred / Verification**. Commit messages map 1:1 to sprints:
`Sprint 2: player kinematics + boing boot`.

## Divergence rules (do NOT break these without flagging)

1. **Original IP only.** No names, sprites, sound motifs, or level layouts
   from Commander Keen or any other game. The homage is structural (EGA
   palette, tile platforming, collect-the-ship-parts arc) — never literal. If
   a generated name or design lands too close to an existing game, rename it
   and note the rename in the sprint report.
2. **All simulation code lives in `src/lib/` and is framework-free** — no
   DOM, no Canvas, no Vite imports. `lib/` must run in plain Node. Say so in
   file headers. Rendering reads sim state; it never mutates it.
3. **Every color is a palette index.** Functions take `PaletteIndex`, not hex
   strings. The only hex literals in the repo are the 16 in `palette.ts` and
   `tokens.css`.
4. **Levels stay hand-editable.** No binary level formats, no JSON levels. If
   a feature needs per-tile metadata, extend the ASCII legend.
5. **Fixed timestep is sacred.** No physics in the render callback. Ever.

## Level legend (source of truth — see levels/LEGEND.md once it exists)

```
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

## Decision gates

- **GATE A (before Sprint 2):** keyboard-only vs. gamepad.
  **Default:** keyboard-only (arrows + Ctrl jump + Alt boing); `input.ts` seam
  so gamepad is additive later.
- **GATE B (before Sprint 5):** walkable overworld vs. level-select screen.
  **Default:** level-select; overworld is seam only.
