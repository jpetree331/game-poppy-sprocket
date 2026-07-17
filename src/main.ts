// src/main.ts — browser entry point. DOM/Canvas code lives here, never in lib/.
import "./tokens.css";
import { createLoop } from "./lib/loop.ts";
import { PALETTE } from "./lib/palette.ts";
import { TILE_SIZE } from "./lib/level.ts";
import { createInput } from "./lib/input.ts";
import { createGame, updateGame, type Game } from "./lib/game.ts";
import {
  createCampaign,
  updateCampaign,
  WIN_CUTSCENE_LOCK,
  type LevelEntry,
} from "./lib/campaign.ts";
import { attachKeyboard } from "./input-keyboard.ts";
import { CHECK, ROCKET } from "./lib/art.ts";
import {
  bakeSprite,
  drawBubbles,
  drawEnemies,
  drawHud,
  drawItems,
  drawNumber,
  drawPlayer,
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

function update(dt: number): void {
  const snap = input.sample();
  if (soloGame) updateGame(soloGame, snap, dt);
  else updateCampaign(campaign, snap, dt);
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
const PART_CHIP_COLORS = [6, 3, 4, 12] as const;

function render(_alpha: number): void {
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  if (soloGame) {
    drawGameWorld(soloGame);
    if (soloGame.phase === "gameover") drawGameOverCard();
    return;
  }

  switch (campaign.screen) {
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
  drawHud(ctx, game, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  if (debugOverlay) drawDebug(game, camX, camY);
}

// --- level select (GATE B default; canvas-font labels are placeholders
// until Sprint 6's pixel lettering) ---
function drawSelectScreen(): void {
  ctx.textAlign = "center";
  ctx.fillStyle = PALETTE[14];
  ctx.font = "16px monospace";
  ctx.fillText("POPPY SPROCKET", 160, 36);
  ctx.fillStyle = PALETTE[11];
  ctx.font = "8px monospace";
  ctx.fillText("MAROONED ON MURKK-7", 160, 50);

  const slotW = 40;
  const gap = 12;
  const x0 = (LOGICAL_WIDTH - (5 * slotW + 4 * gap)) / 2;
  for (let i = 0; i < 5; i++) {
    const x = x0 + i * (slotW + gap);
    const y = 84;
    const selected = campaign.cursor === i;
    ctx.strokeStyle = selected ? PALETTE[14] : PALETTE[8];
    ctx.strokeRect(x + 0.5, y + 0.5, slotW - 1, 39);
    // Level number, 2× pixel digits.
    ctx.drawImage(digitCanvas(i + 1), x + 5, y + 5, 8, 10);
    // Completion check.
    if (campaign.completed[i]) ctx.drawImage(checkSprite, x + slotW - 14, y + 4);
    // The part this level holds, shown once collected.
    const part = campaign.partByLevel[i];
    if (part && campaign.run.parts[part - 1]) {
      ctx.fillStyle = PALETTE[PART_CHIP_COLORS[part - 1]];
      ctx.fillRect(x + 14, y + 22, 12, 12);
      ctx.drawImage(digitCanvas(part), x + 18, y + 25);
    }
    ctx.fillStyle = selected ? PALETTE[15] : PALETTE[7];
    ctx.font = "5px monospace";
    ctx.fillText(campaign.entries[i].name, x + slotW / 2, y + 49);
  }

  ctx.fillStyle = PALETTE[7];
  ctx.font = "8px monospace";
  ctx.fillText("ARROWS PICK · JUMP TO GO", 160, 168);
  ctx.textAlign = "left";
  // Score so far.
  drawNumber(ctx, campaign.run.score, 148, 180, 6);
}

// Tiny helper: digits are baked in render.ts; reuse via drawNumber's cache
// isn't exposed, so bake locally once.
const digitCache = new Map<number, HTMLCanvasElement>();
function digitCanvas(n: number): HTMLCanvasElement {
  let c = digitCache.get(n);
  if (!c) {
    c = document.createElement("canvas");
    c.width = 4;
    c.height = 5;
    const cc = c.getContext("2d")!;
    drawNumber(cc, n, 0, 0);
    digitCache.set(n, c);
  }
  return c;
}

// --- the launch cutscene: reassemble, sputter, blast off, card ---
function drawWinCutscene(t: number): void {
  // Murkk-7 ground line.
  ctx.fillStyle = PALETTE[8];
  ctx.fillRect(0, 176, LOGICAL_WIDTH, 24);
  ctx.fillStyle = PALETTE[7];
  ctx.fillRect(0, 176, LOGICAL_WIDTH, 2);

  const groundY = 176;
  const cx = 144; // rocket left (32px wide at 2×)
  let y = groundY - 64;
  let shake = 0;

  if (t < 2.5) {
    // Sputtering on the pad.
    if (t > 1) shake = Math.floor(t * 20) % 2 === 0 ? 1 : -1;
  } else if (t < 6.5) {
    const rise = (t - 2.5) * (t - 2.5) * 22;
    y -= rise;
    shake = Math.floor(t * 30) % 2 === 0 ? 1 : 0;
  } else {
    y = -100; // gone home
  }

  if (y > -80) {
    ctx.drawImage(rocketSprite, cx + shake, Math.round(y), 32, 64);
    // Flame once she's firing.
    if (t > 1.6 && t < 6.5) {
      const fy = Math.round(y) + 50;
      ctx.fillStyle = PALETTE[Math.floor(t * 15) % 2 === 0 ? 14 : 12];
      ctx.fillRect(cx + 10 + shake, fy, 12, 8 + (Math.floor(t * 10) % 3) * 3);
      ctx.fillStyle = PALETTE[15];
      ctx.fillRect(cx + 14 + shake, fy, 4, 5);
    }
  }

  ctx.textAlign = "center";
  if (t >= 6) {
    ctx.fillStyle = PALETTE[15];
    ctx.font = "16px monospace";
    ctx.fillText("SEE YOU AFTER DINNER", 160, 90);
    ctx.fillStyle = PALETTE[14];
    ctx.font = "8px monospace";
    ctx.fillText("POPPY SPROCKET WILL RETURN", 160, 108);
    if (t >= WIN_CUTSCENE_LOCK) {
      ctx.fillStyle = PALETTE[7];
      ctx.fillText("PRESS JUMP", 160, 150);
    }
  } else if (t < 2.5) {
    ctx.fillStyle = PALETTE[11];
    ctx.font = "8px monospace";
    ctx.fillText("ALL FOUR PARTS RECOVERED!", 160, 60);
  }
  ctx.textAlign = "left";
}

// Placeholder game-over card (canvas text). Sprint 6 replaces the lettering
// with pixel arrays.
function drawGameOverCard(): void {
  ctx.fillStyle = PALETTE[0];
  ctx.fillRect(40, 70, 240, 60);
  ctx.strokeStyle = PALETTE[4];
  ctx.strokeRect(40.5, 70.5, 239, 59);
  ctx.fillStyle = PALETTE[15];
  ctx.font = "16px monospace";
  ctx.textAlign = "center";
  ctx.fillText("GAME OVER", 160, 95);
  ctx.font = "8px monospace";
  ctx.fillStyle = PALETTE[14];
  ctx.fillText("PRESS JUMP TO TRY AGAIN", 160, 115);
  ctx.textAlign = "left";
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
  ctx.fillStyle = PALETTE[15];
  ctx.font = "8px monospace";
  ctx.fillText(`mode ${p.mode}`, 4, 8);
}

const loop = createLoop({ update, render });
loop.start();
