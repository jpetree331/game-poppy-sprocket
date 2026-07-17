// src/lib/loop.ts
// Framework-free: no DOM, no Canvas, no Vite imports. Runs in plain Node.
//
// Fixed-timestep accumulator loop: simulation advances in exact `1/hz`
// steps no matter how fast or slow frames arrive; `render(alpha)` receives
// the fractional progress toward the next step for optional interpolation.
// No physics ever runs in the render callback — that rule is enforced by
// this shape: update() is the only place dt exists.

export interface LoopCallbacks {
  /** Advance simulation by exactly `dt` seconds (always 1/hz). */
  update(dt: number): void;
  /** Draw current state; `alpha` in [0,1) is progress toward the next step. */
  render(alpha: number): void;
}

export interface Loop {
  /** Feed one frame timestamp (ms). Drives updates + a single render. */
  frame(nowMs: number): void;
  /** Start a requestAnimationFrame pump (browser only). */
  start(): void;
  /** Stop the pump and reset timing state. */
  stop(): void;
  /** The fixed step, in seconds. */
  readonly step: number;
}

// If a frame gap exceeds this (tab hidden, debugger pause), clamp it so we
// don't spiral through thousands of catch-up updates.
const MAX_FRAME_SECONDS = 0.25;

export function createLoop(callbacks: LoopCallbacks, hz = 60): Loop {
  const step = 1 / hz;
  let accumulator = 0;
  let last: number | null = null;
  let rafId = 0;
  let running = false;

  function frame(nowMs: number): void {
    if (last === null) last = nowMs;
    let delta = (nowMs - last) / 1000;
    last = nowMs;
    if (delta < 0) delta = 0;
    if (delta > MAX_FRAME_SECONDS) delta = MAX_FRAME_SECONDS;

    accumulator += delta;
    while (accumulator >= step) {
      callbacks.update(step);
      accumulator -= step;
    }
    callbacks.render(accumulator / step);
  }

  function start(): void {
    const raf = (globalThis as { requestAnimationFrame?: (cb: (t: number) => void) => number })
      .requestAnimationFrame;
    if (!raf) {
      throw new Error("createLoop().start() needs requestAnimationFrame; in Node, drive frame() directly.");
    }
    if (running) return;
    running = true;
    const pump = (t: number): void => {
      if (!running) return;
      frame(t);
      rafId = raf(pump);
    };
    rafId = raf(pump);
  }

  function stop(): void {
    running = false;
    const caf = (globalThis as { cancelAnimationFrame?: (id: number) => void })
      .cancelAnimationFrame;
    if (caf && rafId) caf(rafId);
    rafId = 0;
    last = null;
    accumulator = 0;
  }

  return { frame, start, stop, step };
}
