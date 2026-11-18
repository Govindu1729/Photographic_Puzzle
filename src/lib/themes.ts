export interface Theme {
  id: string
  label: string
  emoji: string
  /** page background gradient (hero color is blended in by the game) */
  pageBase: string
  boardBg: string
  cellBg: string
  panelBg: string
  panelBorder: string
  text: string
  textSoft: string
  accent: string
  accentHover: string
  overlayBg: string
}

export const THEMES: Theme[] = [
  {
    id: "strawberry",
    label: "Strawberry",
    emoji: "🍓",
    pageBase: "#fff7f0",
    boardBg: "#f9dbe5",
    cellBg: "rgba(255,255,255,0.65)",
    panelBg: "rgba(255,255,255,0.8)",
    panelBorder: "rgba(244,114,182,0.25)",
    text: "#4c0519",
    textSoft: "rgba(76,5,25,0.65)",
    accent: "#f43f5e",
    accentHover: "#e11d48",
    overlayBg: "rgba(255,255,255,0.82)",
  },
  {
    id: "midnight",
    label: "Midnight",
    emoji: "🌃",
    pageBase: "#1c1a2b",
    boardBg: "#2b2742",
    cellBg: "rgba(255,255,255,0.07)",
    panelBg: "rgba(255,255,255,0.07)",
    panelBorder: "rgba(255,255,255,0.12)",
    text: "#f3efff",
    textSoft: "rgba(243,239,255,0.6)",
    accent: "#c084fc",
    accentHover: "#a855f7",
    overlayBg: "rgba(28,26,43,0.88)",
  },
  {
    id: "matcha",
    label: "Matcha",
    emoji: "🍵",
    pageBase: "#f4f9ee",
    boardBg: "#dcecc9",
    cellBg: "rgba(255,255,255,0.7)",
    panelBg: "rgba(255,255,255,0.8)",
    panelBorder: "rgba(101,163,13,0.25)",
    text: "#1a2e05",
    textSoft: "rgba(26,46,5,0.6)",
    accent: "#65a30d",
    accentHover: "#4d7c0f",
    overlayBg: "rgba(255,255,255,0.85)",
  },
  {
    id: "sunset",
    label: "Sunset",
    emoji: "🌅",
    pageBase: "#fff3e8",
    boardBg: "#ffdcc2",
    cellBg: "rgba(255,255,255,0.65)",
    panelBg: "rgba(255,255,255,0.8)",
    panelBorder: "rgba(234,88,12,0.25)",
    text: "#431407",
    textSoft: "rgba(67,20,7,0.65)",
    accent: "#ea580c",
    accentHover: "#c2410c",
    overlayBg: "rgba(255,255,255,0.85)",
  },
]

export const getTheme = (id: string) => THEMES.find((t) => t.id === id) ?? THEMES[0]
