export interface PhotoLevel {
  level: number
  name: string
  url: string
}

// Merge chain: two identical tiles merge into the NEXT photo in the chain.
// Reaching the final level triggers the big reveal.
export const PHOTO_CHAIN: PhotoLevel[] = [
  {
    level: 0,
    name: "Lil' Chick",
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3d64bc1e65a7.jpg",
  },
  {
    level: 1,
    name: "Kitten",
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/1144ee24267f.jpg",
  },
  {
    level: 2,
    name: "Bunny",
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3ff150dc3a76.jpeg",
  },
  {
    level: 3,
    name: "Golden Puppy",
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/df7bb2509bb8.jpg",
  },
  {
    level: 4,
    name: "Hedgehog",
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/9bba88e0fe00.jpg",
  },
  {
    level: 5,
    name: "Fennec Fox",
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/7806cedd90b0.jpg",
  },
  {
    level: 6,
    name: "Red Panda",
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/77d93e1532fb.jpg",
  },
  {
    level: 7,
    name: "Baby Panda",
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/a5d1a4514a4e.jpg",
  },
  {
    level: 8,
    name: "Quokka",
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/075e459c022c.jpg",
  },
  {
    level: 9,
    name: "The Big Reveal",
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/0f5213104744.jpg",
  },
]

export const WIN_LEVEL = PHOTO_CHAIN.length - 1

// Fallback palette (used until the server reports the true dominant colors)
export const FALLBACK_COLORS = [
  "#ffd166", // chick - warm yellow
  "#ff9f68", // kitten - orange
  "#f8b4d9", // bunny - pink
  "#e8b04b", // puppy - golden
  "#c9a27e", // hedgehog - caramel
  "#f2d5a0", // fennec - cream
  "#d9634b", // red panda - rust
  "#8f9df0", // panda - periwinkle
  "#b8925f", // quokka - fur brown
  "#ff5e8a", // reveal - party pink
]

/** Difficulty = number of photos in the active chain (6 easiest .. 10 hardest).
 *  The reveal photo always stays as the final level. */
export const MIN_DIFFICULTY = 6
export const MAX_DIFFICULTY = PHOTO_CHAIN.length

export function chainFor(count: number): PhotoLevel[] {
  const n = Math.min(Math.max(count, MIN_DIFFICULTY), MAX_DIFFICULTY)
  const animals = PHOTO_CHAIN.slice(0, n - 1)
  return [...animals, PHOTO_CHAIN[PHOTO_CHAIN.length - 1]]
}

export const DIFFICULTY_LABELS: Record<number, string> = {
  6: "Sunny Stroll",
  7: "Playful",
  8: "Spicy",
  9: "Epic",
  10: "Legendary",
}
