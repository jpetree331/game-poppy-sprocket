// src/lib/input.ts
// Framework-free: no DOM, no Canvas, no Vite imports. Runs in plain Node.
//
// GATE A resolved to its default: keyboard-only. This module is the device
// seam — it knows nothing about keyboards. Any adapter (keyboard today,
// gamepad someday) writes the `held` flags; the sim calls `sample()` exactly
// once per fixed tick to get a snapshot with edge detection.

export interface HeldActions {
  left: boolean;
  right: boolean;
  jump: boolean;
  boing: boolean;
}

export interface InputSnapshot {
  left: boolean;
  right: boolean;
  /** Direction went down since the last sample (menus want edges). */
  leftPressed: boolean;
  rightPressed: boolean;
  /** Jump currently held. */
  jump: boolean;
  /** Jump went down since the last sample. */
  jumpPressed: boolean;
  /** Jump went up since the last sample. */
  jumpReleased: boolean;
  /** Boing-boot toggle went down since the last sample. */
  boingPressed: boolean;
}

export interface Input {
  /** Mutable action flags — device adapters write these. */
  held: HeldActions;
  /** Take the per-tick snapshot. Call exactly once per fixed update. */
  sample(): InputSnapshot;
}

export const IDLE_SNAPSHOT: InputSnapshot = {
  left: false,
  right: false,
  leftPressed: false,
  rightPressed: false,
  jump: false,
  jumpPressed: false,
  jumpReleased: false,
  boingPressed: false,
};

export function createInput(): Input {
  const held: HeldActions = { left: false, right: false, jump: false, boing: false };
  let prevLeft = false;
  let prevRight = false;
  let prevJump = false;
  let prevBoing = false;
  return {
    held,
    sample(): InputSnapshot {
      const snap: InputSnapshot = {
        left: held.left,
        right: held.right,
        leftPressed: held.left && !prevLeft,
        rightPressed: held.right && !prevRight,
        jump: held.jump,
        jumpPressed: held.jump && !prevJump,
        jumpReleased: !held.jump && prevJump,
        boingPressed: held.boing && !prevBoing,
      };
      prevLeft = held.left;
      prevRight = held.right;
      prevJump = held.jump;
      prevBoing = held.boing;
      return snap;
    },
  };
}
