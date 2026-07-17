// src/main.ts — browser entry point. DOM/Canvas code lives here, never in lib/.
import "./tokens.css";
import { createLoop } from "./lib/loop.ts";
import { PALETTE } from "./lib/palette.ts";
import { TILE_SIZE } from "./lib/level.ts";
import { createInput } from "./lib/input.ts";
import { createGame, updateGame } from "./lib/game.ts";
import { attachKeyboard } from "./input-keyboard.ts";
import { drawBubbles, drawEnemies, drawPlayer, drawTiles, exitSprite } from "./render.ts";
import level01Text from "../levels/01-crash-site.txt?raw";
import level02Text from "../levels/02-suds-canyon.txt?raw";

export const LOGICAL_WIDTH = 320;
export const LOGICAL_HEIGHT = 200;

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
// Dev-only level jump: ?level=2 boots straight into a later map. The real
// level chain arrives in Sprint 5.
const LEVELS: Record<string, string> = { "1": level01Text, "2": level02Text };
const requested = new URLSearchParams(location.search).get("level") ?? "1";
const game = createGame(LEVELS[requested] ?? level01Text);
const input = createInput();
let debugOverlay = false;
attachKeyboard(input, () => {
  debugOverlay = !debugOverlay;
});

function update(dt: number): void {
  const snap = input.sample();
  updateGame(game, snap, dt);
}

// --- camera ---
function cameraX(): number {
  const p = game.player;
  const target = p.x + p.w / 2 - LOGICAL_WIDTH / 2;
  return Math.max(0, Math.min(target, game.level.width * TILE_SIZE - LOGICAL_WIDTH));
}
function cameraY(): number {
  const worldH = game.level.height * TILE_SIZE;
  if (worldH <= LOGICAL_HEIGHT) return worldH - LOGICAL_HEIGHT; // bottom-align short maps
  const p = game.player;
  const target = p.y + p.h / 2 - LOGICAL_HEIGHT / 2;
  return Math.max(0, Math.min(target, worldH - LOGICAL_HEIGHT));
}

function render(_alpha: number): void {
  ctx.fillStyle = PALETTE[0]; // Murkk-7 night sky
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  const camX = cameraX();
  const camY = cameraY();

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

  drawEnemies(ctx, game.enemies, camX, camY);
  drawBubbles(ctx, game.bubbles, camX, camY);
  drawPlayer(ctx, game.player, camX, camY);

  if (game.phase === "gameover") drawGameOver();
  if (debugOverlay) drawDebug(camX, camY);
}

// Placeholder game-over card (canvas text). Sprint 6 replaces this with the
// title screen and pixel-array lettering.
function drawGameOver(): void {
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

function drawDebug(camX: number, camY: number): void {
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
  // Lives readout until the real HUD lands in Sprint 4.
  ctx.fillStyle = PALETTE[15];
  ctx.font = "8px monospace";
  ctx.fillText(`lives ${game.lives} mode ${p.mode}`, 4, 8);
}

const loop = createLoop({ update, render });
loop.start();
