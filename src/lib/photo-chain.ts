export interface PhotoLevel {
  level: number
  name: string
  url: string
}

// Base animal photos available in the chain
const BASE_PHOTOS = [
  {
    name: "Lil' Chick",
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3d64bc1e65a7.jpg",
  },
  {
    name: "Kitten",
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/1144ee24267f.jpg",
  },
  {
    name: "Bunny",
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/3ff150dc3a76.jpeg",
  },
  {
    name: "Golden Puppy",
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/df7bb2509bb8.jpg",
  },
  {
    name: "Hedgehog",
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/9bba88e0fe00.jpg",
  },
  {
    name: "Fennec Fox",
    url: "https://z-cdn.chatglm.cn/image-search-mcp/images-ppt/fennec-fox.jpg",
  },
]

// Meghu photos (always last two in every chain)
// Using relative paths that work with Next.js basePath
const MEGHU = { name: "Meghu", url: "./meghu.jpeg" }
const MEGHU_DAY = { name: "It's Meghu's Day!", url: "./meghu-collage.jpeg" }

/**
 * Returns a board-size-specific photo chain.
 * 3x3: 6 levels (4 animals + Meghu + collage)
 * 4x4: 8 levels (6 animals + Meghu + collage)
 */
export function chainForSize(size: 3 | 4): PhotoLevel[] {
  const count = size === 3 ? 6 : 8
  const animalCount = count - 2 // leave room for Meghu and Meghu's Day

  const chain: PhotoLevel[] = []
  for (let i = 0; i < animalCount; i++) {
    chain.push({ level: i, ...BASE_PHOTOS[i] })
  }
  chain.push({ level: animalCount, ...MEGHU })
  chain.push({ level: animalCount + 1, ...MEGHU_DAY })

  return chain
}

// Default chain for backwards compatibility (4x4)
export const PHOTO_CHAIN = chainForSize(4)

// Fallback palette (used until the server reports the true dominant colors)
// Indexed to match the 4x4 chain (8 levels max)
export const FALLBACK_COLORS = [
  "#ffd166", // 0: chick - warm yellow
  "#ff9f68", // 1: kitten - orange
  "#f8b4d9", // 2: bunny - pink
  "#e8b04b", // 3: puppy - golden
  "#c9a27e", // 4: hedgehog - caramel
  "#d4a574", // 5: fennec fox - sandy
  "#ffb6c1", // 6: meghu - soft pink
  "#ff69b4", // 7: meghu-collage - hot pink celebration
]

export const WIN_LEVEL_3 = 5
export const WIN_LEVEL_4 = 7
