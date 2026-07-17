# Level legend

One character = one 16×16 tile. Levels are plain text, hand-editable, and
must stay that way (divergence rule 4).

## File format

- Every non-ignored line is one tile row, top to bottom.
- Lines starting with `;` are comments; blank lines are ignored.
- Rows may be ragged on the right — short rows are padded with `.` to the
  longest row's width.
- Unknown characters are a parse **error** (loud, with row/col), so typos
  don't silently become empty space.
- Out-of-bounds is solid to the sides and below, empty above the top row
  (you can jump above the screen, you can't walk off the edge of the world).

## Tiles

| char | meaning |
|------|---------|
| `.`  | empty (space also accepted) |
| `#`  | solid block |
| `=`  | platform — jump-through from below, solid from above |
| `^`  | spike hazard (kills) |

## Entities (parsed into the spawn list; the tile underneath is empty)

| char | meaning |
|------|---------|
| `P`  | player spawn (exactly one per level) |
| `E`  | level exit door |
| `g`  | Globbin — hopper, squishable from above |
| `p`  | Prickle-Pig — ledge-aware patroller, lethal on contact |
| `j`  | Janitor-Bot — stationary turret, lobs slow soap bubbles |
| `*`  | soda-cap pickup (100 pts) |
| `K`  | keycard |
| `D`  | locked door (consumes K; blocks movement until unlocked) |
| `1`  | ship part: Sputter Coil |
| `2`  | ship part: Fizz Tank |
| `3`  | ship part: Left Fin |
| `4`  | ship part: Big Red Button |
