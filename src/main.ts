// src/main.ts — browser entry point. DOM/Canvas code lives here, never in lib/.
import "./tokens.css";
import { createLoop } from "./lib/loop.ts";
import { PALETTE, type PaletteIndex } from "./lib/palette.ts";

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

// Integer scaling: largest whole multiple of 320×200 that fits the window,
// letterboxed on --ega-0 black by the flex centering in tokens.css.
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

// --- Sprint 0 proof: a bouncing 16×16 square cycling through all 16 colors ---
const SIZE = 16;
const box = {
  x: 40,
  y: 30,
  vx: 90, // px/s
  vy: 70,
  color: 0 as PaletteIndex,
  colorTimer: 0,
};

function update(dt: number): void {
  box.x += box.vx * dt;
  box.y += box.vy * dt;
  if (box.x <= 0) {
    box.x = 0;
    box.vx = Math.abs(box.vx);
  } else if (box.x + SIZE >= LOGICAL_WIDTH) {
    box.x = LOGICAL_WIDTH - SIZE;
    box.vx = -Math.abs(box.vx);
  }
  if (box.y <= 0) {
    box.y = 0;
    box.vy = Math.abs(box.vy);
  } else if (box.y + SIZE >= LOGICAL_HEIGHT) {
    box.y = LOGICAL_HEIGHT - SIZE;
    box.vy = -Math.abs(box.vy);
  }
  box.colorTimer += dt;
  if (box.colorTimer >= 0.25) {
    box.colorTimer -= 0.25;
    box.color = ((box.color + 1) % 16) as PaletteIndex;
  }
}

function render(_alpha: number): void {
  ctx.fillStyle = PALETTE[8]; // dark gray field so black border reads
  ctx.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);
  ctx.fillStyle = PALETTE[box.color];
  ctx.fillRect(Math.round(box.x), Math.round(box.y), SIZE, SIZE);
}

const loop = createLoop({ update, render });
loop.start();
