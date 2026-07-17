// src/main.ts — browser entry point. DOM/Canvas code lives here, never in lib/.
import "./tokens.css";
import { createLoop } from "./lib/loop.ts";
import { PALETTE, type PaletteIndex } from "./lib/palette.ts";
import { TILE_SIZE } from "./lib/level.ts";
import { createInput } from "./lib/input.ts";
import { createGame, updateGame, type Game, type GameEvents } from "./lib/game.ts";
import {
  createCampaign,
  updateCampaign,
  WIN_CUTSCENE_LOCK,
  type LevelEntry,
} from "./lib/campaign.ts";
import {
  spawnDeathPoof,
  spawnDust,
  spawnSparkleBurst,
  spawnStars,
  updateParticles,
  type Particle,
} from "./lib/particles.ts";
import { attachKeyboard } from "./input-keyboard.ts";
import { armAudioUnlock, isMuted, sfx, toggleMute } from "./audio.ts";
import { CHECK, ROCKET } from "./lib/art.ts";
import {
  bakeSprite,
  drawBubbles,
  drawEnemies,
  drawHud,
  drawItems,
  drawNumber,
  drawParticles,
  drawPlayer,
  drawText,
  drawTiles,
  exitSprite,
} from "./render.ts";
import level01Text from "../levels/01-crash-site.txt?raw";
import level02Text from "../levels/02-suds-canyon.txt?raw";
import level03Text from "../levels/03-the-drippy-depths.txt?raw";
import level04Text from "../levels/04-boing-gulch.txt?raw";
import level05Text from "../levels/05-the-static-summit.txt?raw";

export const LOGICAL_WIDTH = 320;
export const LOGICAL_HEIGHT = 200;

const CAMPAIGN_LEVELS: LevelEntry[] = [
  { name: "CRASH SITE", text: level01Text },
  { name: "SUDS CANYON", text: level02Text },
  { name: "DRIPPY DEPTHS", text: level03Text },
  { name: "BOING GULCH", text: level04Text },
  { name: "STATIC SUMMIT", text: level05Text },
];

const app = document.querySelector<HTMLDivElement>("#app")!;
const canvas = document.createElement("canvas");
canvas.className = "game";
canvas.width = LOGICAL_WIDTH;
canvas.height = LOGICAL_HEIGHT;
app.appendChild(canvas);
const ctx = canvas.getContext("2d")!;
ctx.imageSmoothingEnabled = false;

function fitCanvas(): void {
  const scale = Math.max(
    1,
    Math.min(
      Math.floor(window.innerWidth / LOGICAL_WIDTH),
      Math.floor(window.innerHeight / LOGICAL_HEIGHT),
    ),
  );
  canvas.style.width = `${LOGICAL_WIDTH * scale}px`;
  canvas.style.height = `${LOGICAL_HEIGHT * scale}px`;
}
window.addEventListener("resize", fitCanvas);
fitCanvas();

// --- sim wiring ---
const params = new URLSearchParams(location.search);
const input = createInput();
let debugOverlay = false;
attachKeyboard(input, () => {
  debugOverlay = !debugOverlay;
});
window.addEventListener("keydown", (e) => {
  if (e.code === "KeyM") toggleMute();
});

// Dev shortcuts: ?level=N boots a single level with no chain;
// ?win=1 jumps straight to the launch cutscene.
const soloKey = params.get("level");
const soloGame: Game | null = soloKey
  ? createGame(CAMPAIGN_LEVELS[Number(soloKey) - 1]?.text ?? level01Text)
  : null;
const campaign = createCampaign(CAMPAIGN_LEVELS);
if (params.get("win") === "1") {
  campaign.run.parts = [true, true, true, true];
  campaign.completed = campaign.entries.map(() => true);
  campaign.screen = "win";
}

armAudioUnlock(() => {
  if (!soloGame && campaign.screen === "title") sfx.jingle();
});

// --- presentation state (fixed-timestep driven, browser-side) ---
const particles: Particle[] = [];
let uiTime = 0;
let wipeT = 0; // 1 → 0 curtain reveal after screen changes

const PART_CHIP_COLORS: readonly PaletteIndex[] = [6, 3, 4, 12];

function handleGameEvents(ev: GameEvents, game: Game): void {
  const p = game.player;
  const feetX = p.x + p.w / 2;
  const feetY = p.y + p.h;
  if (ev.jumped) sfx.jump();
  if (ev.boinged === "small") {
    sfx.boingSmall();
    spawnDust(particles, feetX, feetY);
  } else if (ev.boinged === "big") {
    sfx.boingBig();
    spawnDust(particles, feetX, feetY);
  }
  if (ev.landed) spawnDust(particles, feetX, feetY);
  if (ev.squished) {
    sfx.squish();
    spawnStars(particles, feetX, feetY);
  }
  if (ev.capsCollected > 0) sfx.pickup();
  if (ev.gotKeycard) sfx.keycard();
  for (const part of ev.partsCollected) {
    sfx.part();
    spawnSparkleBurst(particles, p.x + p.w / 2, p.y + p.h / 2, PART_CHIP_COLORS[part - 1]);
  }
  if (ev.doorOpened) sfx.door();
  if (ev.died) {
    sfx.death();
    spawnDeathPoof(particles, feetX, p.y + 4);
  }
  if (ev.gameOver) sfx.gameOver();
}

function update(dt: number): void {
  uiTime += dt;
  const snap = input.sample();
  if (soloGame) {
    const ev = updateGame(soloGame, snap, dt);
    handleGameEvents(ev, soloGame);
  } else {
    const before = campaign.screen;
    const ev = updateCampaign(campaign, snap, dt);
    if (ev.game && campaign.game) handleGameEvents(ev.game, campaign.game);
    if (ev.levelStarted) wipeT = 1;
    if (ev.levelCompleted) {
      sfx.levelDone();
      wipeT = 1;
    }
    if (ev.won) sfx.launch();
    if (ev.runReset) sfx.jingle();
    if (before !== campaign.screen && campaign.screen === "select") wipeT = Math.max(wipeT, 0.6);
  }
  updateParticles(particles, dt);
  wipeT = Math.max(0, wipeT - dt * 2.2);
}

// --- camera ---
function cameraX(game: Game): number {
  const p = game.player;
  const target = p.x + p.w / 2 - LOGICAL_WIDTH / 2;
  return Math.max(0, Math.min(target, game.level.width * TILE_SIZE - LOGICAL_WIDTH));
}
function cameraY(game: Game): number {
  const worldH = game.level.height * TILE_SIZE;
  if (worldH <= LOGICAL_HEIGHT) return worldH - LOGICAL_HEIGHT; // bottom-align short maps
  const p = game.player;
  const target = p.y + p.h / 2 - LOGICAL_HEIGHT / 2;
  return Math.max(0, Math.min(target, worldH - LOGICAL_HEIGHT));
}

const checkSprite = bakeSprite(CHECK);
const rocketSprite = bakeSprite(ROCKET);

function render(_alpha: number): void {
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  if (soloGame) {
    drawGameWorld(soloGame);
    if (soloGame.phase === "gameover") drawGameOverCard();
  } else {
    switch (campaign.screen) {
      case "title":
        drawTitleScreen();
        break;
      case "select":
        drawSelectScreen();
        break;
      case "game":
      case "gameover":
        if (campaign.game) drawGameWorld(campaign.game);
        if (campaign.screen === "gameover") drawGameOverCard();
        break;
      case "win":
        drawWinCutscene(campaign.winTime);
        break;
    }
  }

  drawWipe();
  if (isMuted()) drawText(ctx, "MUTE", 301, 3, { color: 12 });
}

function drawGameWorld(game: Game): void {
  const camX = cameraX(game);
  const camY = cameraY(game);
  drawTiles(ctx, game.level, camX, camY, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  for (const s of game.level.spawns) {
    if (s.kind === "exit") {
      ctx.drawImage(
        exitSprite,
        s.col * TILE_SIZE - Math.round(camX),
        s.row * TILE_SIZE - Math.round(camY),
      );
    }
  }
  drawItems(ctx, game.items, camX, camY, game.player.animTime);
  drawEnemies(ctx, game.enemies, camX, camY);
  drawBubbles(ctx, game.bubbles, camX, camY);
  drawPlayer(ctx, game.player, camX, camY);
  drawParticles(ctx, particles, camX, camY);
  drawHud(ctx, game, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  if (debugOverlay) drawDebug(game, camX, camY);
}

// --- title screen: pixel-array lettering, palette-cycling border ---
function drawTitleScreen(): void {
  const border = (1 + (Math.floor(uiTime * 9) % 15)) as PaletteIndex;
  ctx.fillStyle = PALETTE[border];
  ctx.fillRect(0, 0, LOGICAL_WIDTH, 3);
  ctx.fillRect(0, LOGICAL_HEIGHT - 3, LOGICAL_WIDTH, 3);
  ctx.fillRect(0, 0, 3, LOGICAL_HEIGHT);
  ctx.fillRect(LOGICAL_WIDTH - 3, 0, 3, LOGICAL_HEIGHT);

  drawText(ctx, "POPPY", 160, 34, { color: 14, scale: 4, align: "center" });
  drawText(ctx, "SPROCKET", 160, 60, { color: 14, scale: 4, align: "center" });
  drawText(ctx, "IN", 160, 88, { color: 7, align: "center" });
  drawText(ctx, "MAROONED ON MURKK-7", 160, 100, { color: 11, scale: 2, align: "center" });

  if (Math.floor(uiTime * 2) % 3 !== 2) {
    drawText(ctx, "PRESS JUMP TO START", 160, 140, { color: 15, align: "center" });
  }
  drawText(ctx, "ARROWS MOVE / CTRL JUMPS / ALT BOINGS", 160, 164, { color: 8, align: "center" });
  drawText(ctx, "M MUTES THE BLEEPS", 160, 174, { color: 8, align: "center" });
}

// --- level select (GATE B default) ---
function drawSelectScreen(): void {
  drawText(ctx, "POPPY SPROCKET", 160, 24, { color: 14, scale: 2, align: "center" });
  drawText(ctx, "MAROONED ON MURKK-7", 160, 42, { color: 11, align: "center" });

  const slotW = 40;
  const gap = 12;
  const x0 = (LOGICAL_WIDTH - (5 * slotW + 4 * gap)) / 2;
  for (let i = 0; i < 5; i++) {
    const x = x0 + i * (slotW + gap);
    const y = 78;
    const selected = campaign.cursor === i;
    ctx.strokeStyle = PALETTE[selected ? 14 : 8];
    ctx.strokeRect(x + 0.5, y + 0.5, slotW - 1, 39);
    drawText(ctx, String(i + 1), x + 5, y + 5, { color: selected ? 15 : 7, scale: 2 });
    if (campaign.completed[i]) ctx.drawImage(checkSprite, x + slotW - 14, y + 4);
    const part = campaign.partByLevel[i];
    if (part && campaign.run.parts[part - 1]) {
      ctx.fillStyle = PALETTE[PART_CHIP_COLORS[part - 1]];
      ctx.fillRect(x + 14, y + 22, 12, 12);
      drawText(ctx, String(part), x + 19, y + 26, { color: 15 });
    }
    drawText(ctx, campaign.entries[i].name, x + slotW / 2, y + 45, {
      color: selected ? 15 : 7,
      align: "center",
    });
  }

  drawText(ctx, "ARROWS PICK / JUMP TO GO", 160, 156, { color: 7, align: "center" });
  drawText(ctx, "SCORE", 138, 176, { color: 7 });
  drawNumber(ctx, campaign.run.score, 162, 176, 6);
}

// --- the launch cutscene ---
function drawWinCutscene(t: number): void {
  ctx.fillStyle = PALETTE[8];
  ctx.fillRect(0, 176, LOGICAL_WIDTH, 24);
  ctx.fillStyle = PALETTE[7];
  ctx.fillRect(0, 176, LOGICAL_WIDTH, 2);

  const groundY = 176;
  const cx = 144;
  let y = groundY - 64;
  let shake = 0;

  if (t < 2.5) {
    if (t > 1) shake = Math.floor(t * 20) % 2 === 0 ? 1 : -1;
  } else if (t < 6.5) {
    y -= (t - 2.5) * (t - 2.5) * 22;
    shake = Math.floor(t * 30) % 2 === 0 ? 1 : 0;
  } else {
    y = -100;
  }

  if (y > -80) {
    ctx.drawImage(rocketSprite, cx + shake, Math.round(y), 32, 64);
    if (t > 1.6 && t < 6.5) {
      const fy = Math.round(y) + 50;
      ctx.fillStyle = PALETTE[Math.floor(t * 15) % 2 === 0 ? 14 : 12];
      ctx.fillRect(cx + 10 + shake, fy, 12, 8 + (Math.floor(t * 10) % 3) * 3);
      ctx.fillStyle = PALETTE[15];
      ctx.fillRect(cx + 14 + shake, fy, 4, 5);
    }
  }

  if (t >= 6) {
    drawText(ctx, "SEE YOU AFTER DINNER", 160, 80, { color: 15, scale: 2, align: "center" });
    drawText(ctx, "POPPY SPROCKET WILL RETURN", 160, 102, { color: 14, align: "center" });
    if (t >= WIN_CUTSCENE_LOCK) {
      drawText(ctx, "PRESS JUMP", 160, 144, { color: 7, align: "center" });
    }
  } else if (t < 2.5) {
    drawText(ctx, "ALL FOUR PARTS RECOVERED!", 160, 56, { color: 11, align: "center" });
  }
}

function drawGameOverCard(): void {
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(40, 70, 240, 60);
  ctx.strokeStyle = PALETTE[4];
  ctx.strokeRect(40.5, 70.5, 239, 59);
  drawText(ctx, "GAME OVER", 160, 84, { color: 15, scale: 2, align: "center" });
  drawText(ctx, "PRESS JUMP TO TRY AGAIN", 160, 108, { color: 14, align: "center" });
}

// EGA curtain wipe: staggered black bars sweep off after screen changes.
function drawWipe(): void {
  if (wipeT <= 0) return;
  ctx.fillStyle = PALETTE[0];
  const bars = 16;
  const barW = LOGICAL_WIDTH / bars;
  for (let i = 0; i < bars; i++) {
    const local = Math.min(1, Math.max(0, wipeT * 1.6 - (i % 4) * 0.12));
    ctx.fillRect(Math.round(i * barW), 0, Math.ceil(barW), Math.round(LOGICAL_HEIGHT * local));
  }
}

function drawDebug(game: Game, camX: number, camY: number): void {
  ctx.strokeStyle = PALETTE[3];
  ctx.lineWidth = 1;
  const x0 = -(Math.round(camX) % TILE_SIZE);
  const y0 = -(Math.round(camY) % TILE_SIZE);
  for (let x = x0; x <= LOGICAL_WIDTH; x += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, LOGICAL_HEIGHT);
    ctx.stroke();
  }
  for (let y = y0; y <= LOGICAL_HEIGHT; y += TILE_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(LOGICAL_WIDTH, y + 0.5);
    ctx.stroke();
  }
  const p = game.player;
  ctx.strokeStyle = PALETTE[13];
  ctx.strokeRect(Math.round(p.x - camX) + 0.5, Math.round(p.y - camY) + 0.5, p.w, p.h);
  drawText(ctx, `MODE ${p.mode}`, 4, 4, { color: 15 });
}

const loop = createLoop({ update, render });
loop.start();
