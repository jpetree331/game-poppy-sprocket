// scripts/verify-sprint5.mjs — run with: npm run verify:5
//
// The level chain in plain Node: select-screen navigation, exit → completed
// slot → back to select, run-state carried between levels, win state when
// all four parts are home, and game-over → fresh run. Synthetic mini-levels
// keep the walk deterministic; the shipping levels get integrity checks
// (parseable, one part each across 02–05, exits everywhere).

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseLevel } from "../src/lib/level.ts";
import { createCampaign, updateCampaign } from "../src/lib/campaign.ts";
import { IDLE_SNAPSHOT } from "../src/lib/input.ts";

const DT = 1 / 60;
const snap = (o = {}) => ({ ...IDLE_SNAPSHOT, ...o });

console.log("verify-sprint5:");

// Five one-screen levels: part N sits between P and E (level 1 has none).
function mini(part) {
  return `
;mini
..........
.P..${part ?? "."}..E..
##########
`.trim();
}
const entries = [
  { name: "ONE", text: mini(null) },
  { name: "TWO", text: mini(1) },
  { name: "THREE", text: mini(2) },
  { name: "FOUR", text: mini(3) },
  { name: "FIVE", text: mini(4) },
];

// --- select navigation + part map ---
{
  const c = createCampaign(entries);
  assert.deepEqual(c.partByLevel, [null, 1, 2, 3, 4]);
  updateCampaign(c, snap({ rightPressed: true, right: true }), DT);
  assert.equal(c.cursor, 1);
  updateCampaign(c, snap({ leftPressed: true, left: true }), DT);
  updateCampaign(c, snap({ leftPressed: true, left: true }), DT);
  assert.equal(c.cursor, 4, "cursor wraps");
  console.log("  select cursor moves and wraps ✓");
}

/** Play the currently selected level by holding right until the exit. */
function playLevel(c) {
  let ev = updateCampaign(c, snap({ jump: true, jumpPressed: true }), DT);
  assert.ok(ev.levelStarted, "level must start on jump");
  for (let i = 0; i < 1200; i++) {
    ev = updateCampaign(c, snap({ right: true }), DT);
    if (ev.levelCompleted) return ev;
  }
  assert.fail("level did not complete within 20 sim-seconds");
}

// --- full chain: five levels, four parts, win state ---
{
  const c = createCampaign(entries);
  const t0 = 0;
  let simSeconds = 0;
  for (let lv = 0; lv < 5; lv++) {
    // move cursor to lv
    while (c.cursor !== lv) updateCampaign(c, snap({ rightPressed: true, right: true }), DT);
    const before = c.run.score;
    const ev = playLevel(c);
    simSeconds += 0; // playLevel ticks are 1/60 each; tracked below via ticks if needed
    assert.ok(c.completed[lv], `level ${lv} marked complete`);
    if (lv === 0) {
      assert.equal(c.screen, "select", "back to select after a partless level");
      assert.equal(c.run.score, before, "no part, no part score");
    } else if (lv < 4) {
      assert.equal(c.screen, "select");
      assert.ok(c.run.parts[lv - 1], `part ${lv} recovered`);
    } else {
      assert.ok(ev.won, "final part + exit = win");
      assert.equal(c.screen, "win", "cutscene rolls");
    }
  }
  assert.deepEqual(c.run.parts, [true, true, true, true]);
  // Cutscene: jump is ignored until the lock elapses.
  updateCampaign(c, snap({ jump: true, jumpPressed: true }), DT);
  assert.equal(c.screen, "win", "cutscene can't be skipped instantly");
  for (let i = 0; i < 60 * 8; i++) updateCampaign(c, snap(), DT);
  const ev = updateCampaign(c, snap({ jump: true, jumpPressed: true }), DT);
  assert.ok(ev.runReset, "jump after the card resets the run");
  assert.equal(c.screen, "select");
  assert.deepEqual(c.run.parts, [false, false, false, false]);
  assert.ok(c.completed.every((x) => !x), "slots cleared for the new run");
  console.log("  full chain: 5 levels → win cutscene → fresh run ✓");
}

// --- score persists across levels within a run ---
{
  const c = createCampaign(entries);
  playLevel(c); // level 1, no part
  while (c.cursor !== 1) updateCampaign(c, snap({ rightPressed: true, right: true }), DT);
  playLevel(c); // level 2, part 1 = 1000 pts
  assert.equal(c.run.score, 1000, "part score carried back to select");
  console.log("  run score persists across the chain ✓");
}

// --- game over in a level → fresh run from select ---
{
  const deadly = `
;deadly
..........
.P..^..E..
##########
`.trim();
  const c = createCampaign([{ name: "OW", text: deadly }, ...entries.slice(1)]);
  updateCampaign(c, snap({ jump: true, jumpPressed: true }), DT); // enter level
  let overs = 0;
  for (let i = 0; i < 6000 && c.screen !== "gameover"; i++) {
    const ev = updateCampaign(c, snap({ right: true }), DT);
    if (ev.game?.gameOver) overs++;
  }
  assert.equal(c.screen, "gameover");
  assert.equal(overs, 1);
  const ev = updateCampaign(c, snap({ jump: true, jumpPressed: true }), DT);
  assert.ok(ev.runReset);
  assert.equal(c.screen, "select");
  assert.equal(c.run.lives, 3);
  console.log("  in-level game over → fresh run at select ✓");
}

// --- shipping levels: parse, exits, exactly one of each part across 02–05 ---
{
  const files = [
    "01-crash-site",
    "02-suds-canyon",
    "03-the-drippy-depths",
    "04-boing-gulch",
    "05-the-static-summit",
  ];
  const partsSeen = [];
  files.forEach((f, i) => {
    const lvl = parseLevel(readFileSync(new URL(`../levels/${f}.txt`, import.meta.url), "utf8"));
    assert.ok(lvl.spawns.some((s) => s.kind === "exit"), `${f} needs an exit`);
    const parts = lvl.spawns.filter((s) => s.kind === "shipPart");
    if (i === 0) assert.equal(parts.length, 0, "level 01 is the tutorial — no part");
    else {
      assert.equal(parts.length, 1, `${f} must hold exactly one part`);
      partsSeen.push(parts[0].part);
    }
  });
  assert.deepEqual([...partsSeen].sort(), [1, 2, 3, 4], "parts 1–4 across levels 02–05");
  console.log("  shipping levels: exits everywhere, parts 1–4 across 02–05 ✓");
}

console.log("verify-sprint5: ALL PASS");
