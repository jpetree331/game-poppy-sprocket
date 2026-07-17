// src/input-keyboard.ts — the keyboard device adapter (browser side).
// Maps keys onto the framework-free input seam. The classic feel:
// arrows move, Ctrl jumps, Alt toggles the Boing Boot. Z/X are friendly
// aliases (Alt likes to grab browser menus even when cancelled).
import type { Input } from "./lib/input.ts";

const BINDINGS: Record<string, keyof Input["held"]> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ControlLeft: "jump",
  ControlRight: "jump",
  KeyZ: "jump",
  AltLeft: "boing",
  AltRight: "boing",
  KeyX: "boing",
};

export function attachKeyboard(input: Input, onDebugToggle?: () => void): void {
  window.addEventListener("keydown", (e) => {
    if (e.code === "F1") {
      onDebugToggle?.();
      e.preventDefault();
      return;
    }
    const action = BINDINGS[e.code];
    if (action) {
      input.held[action] = true;
      e.preventDefault(); // keep arrows from scrolling, Alt from menu-grabbing
    }
  });
  window.addEventListener("keyup", (e) => {
    const action = BINDINGS[e.code];
    if (action) {
      input.held[action] = false;
      e.preventDefault();
    }
  });
  // If the tab loses focus mid-hold, release everything.
  window.addEventListener("blur", () => {
    input.held.left = input.held.right = input.held.jump = input.held.boing = false;
  });
}
