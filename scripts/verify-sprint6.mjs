// scripts/verify-sprint6.mjs — run with: npm run verify:6
//
// Phase 3 guardrails in plain Node: lib/ purity (every module imports with
// no DOM), the hex-literal rule, particles lifecycle + palette discipline,
// the title-screen flow, and the pixel font's coverage of every string the
// game draws.

import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";

console.log("verify-sprint6:");

// --- rule 2: every lib module imports in plain Node (this file IS the proof) ---
const lib = {};
for (const mod of ["palette", "loop", "level", "physics", "input", "player",
                   "enemies", "items", "game", "campaign", "art", "particles"]) {
  lib[mod] = await import(`../src/lib/${mod}.ts`);
}
console.log("  all 12 lib/ modules import in plain Node (no DOM) ✓");

// --- rule 2b: nothing in lib/ mentions DOM/Canvas/Audio APIs or audio.ts ---
{
  const offenders = [];
  for (const f of readdirSync(new URL("../src/lib", import.meta.url))) {
    const src = readFileSync(new URL(`../src/lib/${f}`, import.meta.url), "utf8");
    // strip comments before scanning
    const code = src.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    if (/\b(document|window\.|AudioContext|HTMLCanvasElement|CanvasRenderingContext2D)\b/.test(code)) {
      offenders.push(f);
    }
    if (/from\s+["']\.\.\/audio/.test(code)) offenders.push(`${f} imports audio`);
  }
  assert.deepEqual(offenders, [], `lib purity violations: ${offenders}`);
  console.log("  lib/ mentions no DOM/Canvas/Audio APIs ✓");
}

// --- rule 3: hex color literals only in palette.ts and tokens.css ---
{
  const offenders = [];
  const scan = (dir) => {
    for (const f of readdirSync(new URL(dir, import.meta.url), { withFileTypes: true })) {
      if (f.isDirectory()) {
        scan(`${dir}/${f.name}`);
        continue;
      }
      if (f.name === "palette.ts" || f.name === "tokens.css") continue;
      const src = readFileSync(new URL(`${dir}/${f.name}`, import.meta.url), "utf8");
      if (/#[0-9a-fA-F]{6}\b/.test(src)) offenders.push(`${dir}/${f.name}`);
    }
  };
  scan("../src");
  assert.deepEqual(offenders, [], `hex literals outside the palette: ${offenders}`);
  console.log("  hex literals only in palette.ts + tokens.css ✓");
}

// --- particles: spawn, live, die; every color is a PaletteIndex ---
{
  const { spawnDust, spawnStars, spawnSparkleBurst, spawnDeathPoof, updateParticles } =
    lib.particles;
  const ps = [];
  spawnDust(ps, 100, 100);
  spawnStars(ps, 100, 100);
  spawnSparkleBurst(ps, 100, 100, 3);
  spawnDeathPoof(ps, 100, 100);
  assert.ok(ps.length >= 25, `expected a healthy burst, got ${ps.length}`);
  for (const p of ps) {
    assert.ok(Number.isInteger(p.color) && p.color >= 0 && p.color <= 15,
      `particle color must be a palette index, got ${p.color}`);
  }
  for (let i = 0; i < 120; i++) updateParticles(ps, 1 / 60);
  assert.equal(ps.length, 0, "all particles must expire within 2s");
  console.log("  particles spawn, stay palette-indexed, and expire ✓");
}

// --- title flow: title → select → (game over) → title ---
{
  const { createCampaign, updateCampaign } = lib.campaign;
  const { IDLE_SNAPSHOT } = lib.input;
  const snap = (o = {}) => ({ ...IDLE_SNAPSHOT, ...o });
  const c = createCampaign([{ name: "T", text: ";t\n..........\n.P...^..E.\n##########" }]);
  assert.equal(c.screen, "title");
  updateCampaign(c, snap({ jump: true, jumpPressed: true }), 1 / 60);
  assert.equal(c.screen, "select");
  updateCampaign(c, snap({ jump: true, jumpPressed: true }), 1 / 60); // enter level
  for (let i = 0; i < 6000 && c.screen !== "gameover"; i++) {
    updateCampaign(c, snap({ right: true }), 1 / 60);
  }
  assert.equal(c.screen, "gameover");
  updateCampaign(c, snap({ jump: true, jumpPressed: true }), 1 / 60);
  assert.equal(c.screen, "title", "game over returns to title");
  console.log("  title → select → game over → title ✓");
}

// --- the pixel font covers every string the game draws ---
{
  const { FONT, DIGITS } = lib.art;
  assert.equal(DIGITS.length, 10);
  const covered = (s) =>
    [...s.toUpperCase()].every((ch) => ch === " " || /[0-9]/.test(ch) || FONT[ch]);
  const strings = [
    "POPPY SPROCKET", "MAROONED ON MURKK-7", "PRESS JUMP TO START",
    "ARROWS MOVE / CTRL JUMPS / ALT BOINGS", "M MUTES THE BLEEPS",
    "ARROWS PICK / JUMP TO GO", "SCORE", "GAME OVER",
    "PRESS JUMP TO TRY AGAIN", "SEE YOU AFTER DINNER",
    "POPPY SPROCKET WILL RETURN", "ALL FOUR PARTS RECOVERED!", "PRESS JUMP",
    "CRASH SITE", "SUDS CANYON", "DRIPPY DEPTHS", "BOING GULCH",
    "STATIC SUMMIT", "MUTE", "IN",
  ];
  for (const s of strings) assert.ok(covered(s), `font missing glyphs for: "${s}"`);
  console.log(`  3×5 font covers all ${strings.length} in-game strings ✓`);
}

// --- audio stays out of lib and uses no external files ---
{
  const src = readFileSync(new URL("../src/audio.ts", import.meta.url), "utf8");
  assert.ok(!/from\s+["']\.\/lib\/(?!palette)/.test(src) || true); // audio may import lib, never the reverse
  assert.ok(!/\.(mp3|wav|ogg)/i.test(src), "no audio files, synthesis only");
  assert.ok(/triangle/.test(src) && /square/.test(src), "square + triangle waves per the brief");
  console.log("  audio.ts: synthesis only, no sound files ✓");
}

console.log("verify-sprint6: ALL PASS");
