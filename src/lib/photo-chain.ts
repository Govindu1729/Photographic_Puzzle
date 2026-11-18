export interface PhotoLevel {
  level: number
  name: string
  url: string
}

// Merge chain for Meghu's Day celebration!
// Two MEGHU tiles merge into the big collage reveal.
export const PHOTO_CHAIN: PhotoLevel[] = [
  {
    level: 0,
    name: "Meghu",
    url: "/meghu.jpeg",
  },
  {
    level: 1,
    name: "It's Meghu's Day!",
    url: "/meghu-collage.jpeg",
  },
]

export const WIN_LEVEL = PHOTO_CHAIN.length - 1

// Fallback palette (used until the server reports the true dominant colors)
export const FALLBACK_COLORS = [
  "#ffb6c1", // meghu - soft pink
  "#ff69b4", // reveal - hot pink celebration
]

/** Difficulty is now fixed (no slider) - just the 2-photo chain */
export const MIN_DIFFICULTY = 2
export const MAX_DIFFICULTY = 2

export function chainFor(count: number): PhotoLevel[] {
  // Always return the full Meghu chain (2 photos)
  return PHOTO_CHAIN
}

export const DIFFICULTY_LABELS: Record<number, string> = {
  2: "Meghu's Day",
}
