// src/lib/level.ts
// Framework-free: no DOM, no Canvas, no Vite imports. Runs in plain Node.
//
// Parses the hand-editable ASCII level format (see levels/LEGEND.md) into a
// typed tile grid plus an entity spawn list. Unknown characters are loud
// errors so a typo never silently becomes empty space.

export const TILE_SIZE = 16;

export const TILE = {
  empty: 0,
  solid: 1,
  platform: 2, // jump-through from below, solid from above
  spike: 3,
} as const;
export type TileId = (typeof TILE)[keyof typeof TILE];

export type EntityKind =
  | "exit"
  | "globbin"
  | "pricklePig"
  | "janitorBot"
  | "sodaCap"
  | "keycard"
  | "lockedDoor"
  | "shipPart";

export interface Spawn {
  kind: EntityKind;
  col: number;
  row: number;
  /** Only for kind "shipPart": 1 Sputter Coil, 2 Fizz Tank, 3 Left Fin, 4 Big Red Button. */
  part?: 1 | 2 | 3 | 4;
}

export interface LevelData {
  /** Width/height in tiles. */
  width: number;
  height: number;
  /** Row-major tile grid, length width*height. */
  tiles: TileId[];
  spawns: Spawn[];
  playerSpawn: { col: number; row: number };
}

const ENTITY_CHARS: Record<string, EntityKind> = {
  E: "exit",
  g: "globbin",
  p: "pricklePig",
  j: "janitorBot",
  "*": "sodaCap",
  K: "keycard",
  D: "lockedDoor",
};

export function parseLevel(text: string): LevelData {
  const rows = text
    .split(/\r?\n/)
    .filter((line) => line.length > 0 && !line.startsWith(";"));
  if (rows.length === 0) throw new Error("level: no tile rows");

  const width = Math.max(...rows.map((r) => r.length));
  const height = rows.length;
  const tiles: TileId[] = new Array(width * height).fill(TILE.empty);
  const spawns: Spawn[] = [];
  let playerSpawn: { col: number; row: number } | null = null;

  for (let row = 0; row < height; row++) {
    const line = rows[row];
    for (let col = 0; col < width; col++) {
      const ch = col < line.length ? line[col] : "."; // pad ragged rows
      const i = row * width + col;
      switch (ch) {
        case ".":
        case " ":
          break;
        case "#":
          tiles[i] = TILE.solid;
          break;
        case "=":
          tiles[i] = TILE.platform;
          break;
        case "^":
          tiles[i] = TILE.spike;
          break;
        case "P":
          if (playerSpawn) {
            throw new Error(`level: second player spawn at row ${row}, col ${col}`);
          }
          playerSpawn = { col, row };
          break;
        case "1":
        case "2":
        case "3":
        case "4":
          spawns.push({
            kind: "shipPart",
            col,
            row,
            part: Number(ch) as 1 | 2 | 3 | 4,
          });
          break;
        default: {
          const kind = ENTITY_CHARS[ch];
          if (!kind) {
            throw new Error(`level: unknown char "${ch}" at row ${row}, col ${col}`);
          }
          spawns.push({ kind, col, row });
        }
      }
    }
  }

  if (!playerSpawn) throw new Error("level: missing player spawn (P)");
  return { width, height, tiles, spawns, playerSpawn };
}

/**
 * Tile lookup with world-edge rules: solid to the sides and below the map,
 * empty above the top (jumping above the screen is allowed; walking off the
 * world is not).
 */
export function tileAt(level: LevelData, col: number, row: number): TileId {
  if (row < 0) return TILE.empty;
  if (col < 0 || col >= level.width || row >= level.height) return TILE.solid;
  return level.tiles[row * level.width + col];
}
