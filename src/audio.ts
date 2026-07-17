// src/audio.ts — Web Audio synthesis. Lives OUTSIDE lib/ on purpose: it
// touches the browser's AudioContext. Every sound is synthesized square/
// triangle bleeps — no audio files, and the jingle is an original melody.
//
// Autoplay policy: the AudioContext is created lazily on the FIRST user
// keydown/pointerdown; nothing can sound before user input by construction.

let ctx: AudioContext | null = null;
let muted = false;

export function isMuted(): boolean {
  return muted;
}

export function toggleMute(): void {
  muted = !muted;
}

/** Call once at boot; arms one-time listeners that unlock audio. */
export function armAudioUnlock(onUnlock?: () => void): void {
  const unlock = (): void => {
    if (!ctx) {
      ctx = new AudioContext();
      onUnlock?.();
    }
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("pointerdown", unlock);
  };
  window.addEventListener("keydown", unlock);
  window.addEventListener("pointerdown", unlock);
}

interface BleepOpts {
  wave?: OscillatorType;
  from: number;
  to?: number;
  dur: number;
  vol?: number;
  delay?: number;
}

function bleep({ wave = "square", from, to = from, dur, vol = 0.12, delay = 0 }: BleepOpts): void {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = wave;
  osc.frequency.setValueAtTime(from, t0);
  if (to !== from) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export const sfx = {
  jump(): void {
    bleep({ from: 280, to: 520, dur: 0.1 });
  },
  boingSmall(): void {
    bleep({ from: 420, to: 180, dur: 0.12 });
  },
  boingBig(): void {
    bleep({ from: 620, to: 120, dur: 0.22, vol: 0.16 });
  },
  pickup(): void {
    bleep({ from: 900, dur: 0.05 });
    bleep({ from: 1250, dur: 0.07, delay: 0.05 });
  },
  keycard(): void {
    bleep({ from: 660, dur: 0.08 });
    bleep({ from: 990, dur: 0.12, delay: 0.08 });
  },
  part(): void {
    // Little C-major fanfare.
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => bleep({ from: f, dur: 0.11, delay: i * 0.09, vol: 0.14 }));
  },
  squish(): void {
    bleep({ from: 300, to: 70, dur: 0.1, vol: 0.16 });
  },
  death(): void {
    bleep({ from: 380, to: 60, dur: 0.45, vol: 0.15 });
  },
  door(): void {
    bleep({ from: 160, to: 340, dur: 0.16 });
  },
  levelDone(): void {
    [392, 523, 659].forEach((f, i) => bleep({ from: f, dur: 0.1, delay: i * 0.08 }));
  },
  gameOver(): void {
    [330, 262, 196, 131].forEach((f, i) =>
      bleep({ from: f, dur: 0.18, delay: i * 0.16, wave: "triangle", vol: 0.15 }),
    );
  },
  launch(): void {
    bleep({ from: 60, to: 240, dur: 2.2, vol: 0.1 });
  },
  /**
   * The title jingle: 4 bars of original triangle-wave melody, ~136 bpm.
   * Written for this game; quotes nothing.
   */
  jingle(): void {
    const q = 0.22; // quarter note
    const bars: Array<Array<[number, number]>> = [
      // [freq, beats]
      [[523, 1], [392, 0.5], [523, 0.5], [659, 1], [784, 1]],          // C G C E G
      [[659, 0.5], [784, 0.5], [880, 1], [784, 1], [659, 1]],          // E G A G E
      [[698, 1], [587, 0.5], [698, 0.5], [880, 1], [587, 1]],          // F D F A D
      [[784, 0.5], [659, 0.5], [523, 2], [392, 1]],                    // G E C… G
    ];
    let t = 0;
    for (const bar of bars) {
      for (const [f, beats] of bar) {
        bleep({ wave: "triangle", from: f, dur: q * beats * 0.9, delay: t, vol: 0.13 });
        t += q * beats;
      }
    }
  },
};
