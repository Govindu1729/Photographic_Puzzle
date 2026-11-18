export interface Tile {
  id: number
  level: number // photo-chain index
  row: number
  col: number
  isNew?: boolean // just spawned
  merged?: boolean // just created by a merge (for pop effect)
  dying?: boolean // animation-only ghost sliding into a merge, removed after
}

export interface MoveResult {
  tiles: Tile[]
  dying: Tile[]
  moved: boolean
  mergeEvents: { row: number; col: number; newLevel: number }[]
  scoreGained: number
  win: boolean
  gameOver: boolean
}

export type Direction = "up" | "down" | "left" | "right"

export const BOARD_SIZES = [3, 4] as const
export type BoardSize = (typeof BOARD_SIZES)[number]

let nextId = 1
export const newId = () => nextId++

function gridFromTiles(tiles: Tile[], size: number): (Tile | null)[][] {
  const g: (Tile | null)[][] = Array.from({ length: size }, () =>
    Array.from({ length: size }, () => null)
  )
  for (const t of tiles) g[t.row][t.col] = t
  return g
}

export function emptyCells(tiles: Tile[], size: number) {
  const g = gridFromTiles(tiles, size)
  const cells: { row: number; col: number }[] = []
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) if (!g[r][c]) cells.push({ row: r, col: c })
  return cells
}

export function spawnTile(tiles: Tile[], size: number): Tile[] {
  const cells = emptyCells(tiles, size)
  if (cells.length === 0) return tiles
  const cell = cells[Math.floor(Math.random() * cells.length)]
  const tile: Tile = {
    id: newId(),
    level: 0,
    row: cell.row,
    col: cell.col,
    isNew: true,
  }
  return [...tiles, tile]
}

export function newGame(size: number): Tile[] {
  let tiles: Tile[] = []
  tiles = spawnTile(tiles, size)
  tiles = spawnTile(tiles, size)
  return tiles
}

/**
 * Core 2048 slide+merge. Tiles keep their ids so the UI can animate movement
 * via CSS transforms; merged tiles get a fresh id and `merged` flag.
 */
export function move(
  tiles: Tile[],
  dir: Direction,
  winLevel: number,
  size: number
): MoveResult {
  const grid = gridFromTiles(tiles, size)
  const result: Tile[] = []
  const mergeEvents: { row: number; col: number; newLevel: number }[] = []
  let moved = false
  let scoreGained = 0
  let win = false
  const mergedThisTurn = new Set<number>()

  const range = Array.from({ length: size }, (_, i) => i)
  const rows = dir === "up" ? range : [...range].reverse()
  const cols = dir === "right" ? [...range].reverse() : range

  for (const r of rows) {
    for (const c of cols) {
      const tile = grid[r][c]
      if (!tile) continue
      // walk in the movement direction
      let nr = r,
        nc = c
      const dr = dir === "up" ? -1 : dir === "down" ? 1 : 0
      const dc = dir === "left" ? -1 : dir === "right" ? 1 : 0
      while (true) {
        const tr = nr + dr,
          tc = nc + dc
        if (tr < 0 || tr >= size || tc < 0 || tc >= size) break
        const target = grid[tr][tc]
        if (!target) {
          grid[nr][nc] = null
          nr = tr
          nc = tc
          grid[nr][nc] = tile
          moved = true
        } else if (target.level === tile.level && !mergedThisTurn.has(target.id)) {
          // merge into target's cell
          grid[nr][nc] = null
          nr = tr
          nc = tc
          moved = true
          const newLevel = tile.level + 1
          const mergedTile: Tile = {
            id: newId(),
            level: newLevel,
            row: nr,
            col: nc,
            merged: true,
          }
          mergedThisTurn.add(mergedTile.id)
          // remove the target from grid & result, add merged tile
          grid[nr][nc] = mergedTile
          const tIdx = result.findIndex((t) => t.id === target.id)
          if (tIdx >= 0) result.splice(tIdx, 1)
          result.push(mergedTile)
          mergeEvents.push({ row: nr, col: nc, newLevel })
          scoreGained += (1 << newLevel) * 10
          if (newLevel >= winLevel) win = true
          tile.row = nr
          tile.col = nc // source tile slides onto the merge cell, then disappears
          // mark source tile for removal: not pushed to result as alive
          ;(tile as Tile & { dead?: boolean }).dead = true
          break
        } else break
      }
      if (!(tile as Tile & { dead?: boolean }).dead) {
        tile.row = nr
        tile.col = nc
        if (!result.some((t) => t.id === tile.id)) result.push(tile)
      } else {
        // keep dead tile briefly for slide-into-merge animation
        const deadTile = tile as Tile & { dead?: boolean }
        result.push({ ...deadTile, dead: undefined, merged: false, isNew: false, dying: true })
      }
    }
  }

  // "dying" tiles are placeholders for animation only; filter them out of game state
  const alive = result.filter((t) => !t.dying)
  const dying = result.filter((t) => t.dying)

  // spawn a new tile if anything moved
  let finalTiles = alive
  if (moved) finalTiles = spawnTile(alive, size)

  // game over check
  let gameOver = false
  if (emptyCells(finalTiles, size).length === 0) {
    gameOver = !canMove(finalTiles, size)
  }

  return { tiles: finalTiles, dying, moved, mergeEvents, scoreGained, win, gameOver }
}

export function canMove(tiles: Tile[], size: number) {
  const g = gridFromTiles(tiles, size)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const t = g[r][c]
      if (!t) return true
      if (r + 1 < size && g[r + 1][c]?.level === t.level) return true
      if (c + 1 < size && g[r][c + 1]?.level === t.level) return true
    }
  }
  return false
}

/**
 * Rescue: clears all level-0 tiles (the "Lil' Chicks") to free up space.
 * Returns the surviving tiles and how many were removed.
 * Used when the player is stuck or about to lose.
 */
export function rescue(tiles: Tile[]): { tiles: Tile[]; removed: number } {
  const alive = tiles.filter((t) => t.level > 0)
  return { tiles: alive, removed: tiles.length - alive.length }
}
