// src/main.ts — browser entry point. DOM/Canvas code lives here, never in lib/.
import "./tokens.css";
import { createLoop } from "./lib/loop.ts";
import { PALETTE } from "./lib/palette.ts";
import { parseLevel, TILE_SIZE } from "./lib/level.ts";
import { applyGravity, moveBody, type Body } from "./lib/physics.ts";
import { drawTiles, exitSprite } from "./render.ts";
import level01Text from "../levels/01-crash-site.txt?raw";

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

// --- Keyboard (minimal for the Sprint 1 walkthrough; the real input seam
// arrives with GATE A in Sprint 2) ---
const keys = new Set<string>();
window.addEventListener("keydown", (e) => {
  keys.add(e.code);
  if (e.code === "F1") {
    debugOverlay = !debugOverlay;
    e.preventDefault();
  }
});
window.addEventListener("keyup", (e) => keys.delete(e.code));

// --- Sprint 1 scene: gravity-only dummy box in level 01 ---
const level = parseLevel(level01Text);
let debugOverlay = false;

const dummy: Body = {
  x: level.playerSpawn.col * TILE_SIZE + 2,
  y: level.playerSpawn.row * TILE_SIZE + 2,
  w: 12,
  h: 14,
  vx: 0,
  vy: 0,
  onGround: false,
};
const WALK_SPEED = 80;
const HOP_SPEED = 190; // temporary walkthrough hop — real jump is Sprint 2

function update(dt: number): void {
  dummy.vx = 0;
  if (keys.has("ArrowLeft")) dummy.vx = -WALK_SPEED;
  if (keys.has("ArrowRight")) dummy.vx = WALK_SPEED;
  if (keys.has("ArrowUp") && dummy.onGround) dummy.vy = -HOP_SPEED;
  applyGravity(dummy, dt);
  const result = moveBody(dummy, level, dt);
  if (result.onSpike) {
    // Sprint 1: just reset to spawn; lives/death arrive in Sprint 2/3.
    dummy.x = level.playerSpawn.col * TILE_SIZE + 2;
    dummy.y = level.playerSpawn.row * TILE_SIZE + 2;
    dummy.vx = 0;
    dummy.vy = 0;
  }
}

function cameraX(): number {
  const target = dummy.x + dummy.w / 2 - LOGICAL_WIDTH / 2;
  return Math.max(0, Math.min(target, level.width * TILE_SIZE - LOGICAL_WIDTH));
}
function cameraY(): number {
  const worldH = level.height * TILE_SIZE;
  if (worldH <= LOGICAL_HEIGHT) return worldH - LOGICAL_HEIGHT; // bottom-align short maps
  const target = dummy.y + dummy.h / 2 - LOGICAL_HEIGHT / 2;
  return Math.max(0, Math.min(target, worldH - LOGICAL_HEIGHT));
}

function render(_alpha: number): void {
  ctx.fillStyle = PALETTE[0]; // Murkk-7 night sky
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  const camX = cameraX();
  const camY = cameraY();

  drawTiles(ctx, level, camX, camY, LOGICAL_WIDTH, LOGICAL_HEIGHT);

  // Entities (Sprint 1: just the exit door so the level reads)
  for (const s of level.spawns) {
    if (s.kind === "exit") {
      ctx.drawImage(
        exitSprite,
        s.col * TILE_SIZE - Math.round(camX),
        s.row * TILE_SIZE - Math.round(camY),
      );
    }
  }

  // Dummy box (Poppy's stand-in until Sprint 2)
  ctx.fillStyle = PALETTE[14];
  ctx.fillRect(
    Math.round(dummy.x - camX),
    Math.round(dummy.y - camY),
    dummy.w,
    dummy.h,
  );

  if (debugOverlay) drawDebug(camX, camY);
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
  ctx.strokeStyle = PALETTE[13];
  ctx.strokeRect(
    Math.round(dummy.x - camX) + 0.5,
    Math.round(dummy.y - camY) + 0.5,
    dummy.w,
    dummy.h,
  );
}

const loop = createLoop({ update, render });
loop.start();
