# 🐾 PhotoMerge

A cozy, scrapbook-style **2048-style photo merge puzzle**. Slide tiles, merge two matching photos, and unlock the next cuter photo in the chain — all the way to **The Big Reveal**. Built with Next.js, TypeScript, Tailwind, and the Web Audio API. Fully static-exportable so you can host it on **GitHub Pages** for free.

![PhotoMerge](https://z-cdn.chatglm.cn/z-ai/static/logo.svg)

---

## ✨ Features

- **2048 mechanics with photos** instead of numbers — every merge unlocks the next picture in the chain
- **Difficulty slider** — 6 photos (Sunny Stroll) up to 10 (Legendary)
- **Board size picker** — 3×3 quick bite / 4×4 classic / 5×5 marathon
- **Color-matched effects** — every merge burst, tile glow and unlock banner automatically adopts the upcoming photo's dominant color (sampled in-browser via canvas)
- **3 music stations** (synthesized live, no audio files):
  - 🎧 Lo-Fi Beats · 🌙 Dream Ambient · 🕹️ Arcade Chiptune
- **3 SFX packs**: 🫧 Bubble Pop · 🔔 Glass Chime · 🎮 Retro 8-Bit
- **4 themes**: 🍓 Strawberry · 🌃 Midnight · 🍵 Matcha · 🌅 Sunset
- **Nostalgic scrapbook UI** — Chewy + Patrick Hand fonts, polaroid tiles with washi tape, hand-cut wobbly panels, paper texture
- **Local Hall of Fame leaderboard** — name + score saved in the browser (works offline, perfect for static hosting)
- **Keyboard + swipe** controls, fully responsive, no external runtime dependencies

---

## 🚀 Quick start (local)

```bash
# 1. Install dependencies (Bun or npm both work)
bun install        # or: npm install

# 2. Run the dev server
bun run dev        # or: npm run dev

# 3. Open http://localhost:3000
```

Requires Node 18+ (Node 20 recommended) and either [Bun](https://bun.sh) or npm.

---

## 🌐 Deploy to GitHub Pages

This project is configured for static export (`output: "export"` in `next.config.ts`), so `next build` produces a fully static `./out` folder you can host anywhere.

### Option A — automatic (recommended, GitHub Actions)

1. Push the repo to GitHub.
2. In the repo, go to **Settings → Pages → Build and deployment → Source** and choose **GitHub Actions**.
3. Push to `main`. The included workflow (`.github/workflows/deploy.yml`) builds and deploys automatically.
4. Wait ~1 minute, then open your site:
   - Project page: `https://<user>.github.io/<repo>/`
   - User/org page: `https://<user>.github.io/`

The workflow auto-detects the base path for you.

### Option B — manual

```bash
# For a project page (user.github.io/<repo>), set the base path:
NEXT_BASE_PATH=/your-repo-name bun run build

# For a user/org page (user.github.io), leave it empty:
bun run build

# The ./out folder is your site. Push its contents to the gh-pages branch
# (or upload via the GitHub Pages UI).
```

`npm` works too — just replace `bun` with `npm run`.

> ℹ️ `public/.nojekyll` is included so GitHub Pages doesn't strip the `_next/` asset folder.

---

## 🖼️ Customize with your friend's photos

Open `src/lib/photo-chain.ts` and replace the `url` and `name` fields:

```ts
export const PHOTO_CHAIN: PhotoLevel[] = [
  { level: 0, name: "Baby Alex",  url: "/photos/alex-1.jpg" },
  { level: 1, name: "School Alex", url: "/photos/alex-2.jpg" },
  // ...
  { level: 9, name: "The Big Reveal", url: "/photos/surprise.jpg" },
]
```

**Tips for hosting your own photos on GitHub Pages:**

1. Drop them in `public/photos/` — they'll be served at `/photos/...` (same-origin, so the color-sampling effect works perfectly).
2. Keep them reasonably sized (~200–500 KB each, 400×400 or larger).
3. The final photo (`level: WIN_LEVEL`) is the celebration image — make it the spiciest one. 👑

You can also adjust the curated fallback palette in `FALLBACK_COLORS` if you want specific effect colors.

### Tweak the chain length

- The difficulty slider (6 → 10) lets players pick the chain length at runtime.
- To change the **range**, edit `MIN_DIFFICULTY` / `MAX_DIFFICULTY` in `src/lib/photo-chain.ts`.
- `chainFor(n)` always keeps the last entry (the Big Reveal) as the final level.

---

## 🎨 Customize themes, music, SFX

| What | Where |
| --- | --- |
| Themes (colors, panels, accents) | `src/lib/themes.ts` |
| Music stations (Web Audio synthesis) | `src/lib/audio.ts` → `MUSIC_STYLES`, `scheduleLofiBar` / `scheduleDreamBar` / `scheduleArcadeBar` |
| SFX packs | `src/lib/audio.ts` → `SFX_PACKS`, `mergeSfx` / `spawnSfx` / `winSfx` |
| Game logic (board, merge, score) | `src/lib/game.ts` |
| Particle effects (merge bursts, confetti) | `src/components/ParticleLayer.tsx` |
| Page UI | `src/app/page.tsx` |
| Global styles + scrapbook utilities | `src/app/globals.css` |

---

## 🏆 Leaderboard notes

The Hall of Fame is **local** — it stores the top 10 scores in the browser's `localStorage` under the key `photomerge-leaderboard`. This works on any static host (GitHub Pages included) with zero setup.

**Want a global, cross-device leaderboard?** The easiest no-server path while still hosting on GitHub Pages:

1. Create a free [Firebase](https://firebase.google.com/) project (Realtime Database or Firestore).
2. Add your Firebase config to a new `src/lib/firebase.ts`.
3. Replace the `loadLeaderboard` / `saveScore` helpers in `src/app/page.tsx` with Firestore reads/writes.

Roughly 20 lines of code; the rest of the UI stays the same. Other options: Supabase, JSONBin, or a tiny Cloudflare Worker.

---

## 📁 Project structure

```
.
├── .github/workflows/deploy.yml   # Auto-deploy to GitHub Pages
├── public/
│   ├── .nojekyll                  # Prevents GH Pages from ignoring _next/
│   ├── logo.svg
│   └── robots.txt
├── src/
│   ├── app/
│   │   ├── globals.css            # Tailwind + scrapbook utilities
│   │   ├── layout.tsx             # Fonts (Chewy + Patrick Hand) + metadata
│   │   └── page.tsx               # The game (UI, settings, leaderboard)
│   ├── components/
│   │   └── ParticleLayer.tsx      # Canvas particle bursts + confetti
│   └── lib/
│       ├── audio.ts               # Procedural music + SFX (Web Audio)
│       ├── game.ts                # 2048 engine (variable board size)
│       ├── photo-chain.ts         # Photo list + difficulty helpers
│       └── themes.ts              # Theme palettes
├── next.config.ts                 # Static export + basePath for GH Pages
├── package.json
└── README.md
```

---

## 🧠 How it works (quick tech notes)

- **2048 engine** (`src/lib/game.ts`): a board-agnostic implementation that works for any size (3×3, 4×4, 5×5). Tiles keep stable IDs so the UI can animate movement with CSS transitions; merged tiles get fresh IDs + a `merged` flag for the pop animation; "dying" source tiles briefly slide into the merge cell before being removed.
- **Color sampling** (`clientDominantColor` in `page.tsx`): the upcoming photo is drawn to a 16×16 canvas and the average of its saturated pixels becomes the merge effect color. Runs entirely client-side, so it works on static hosts. (A server route used to do this, but it was removed for GitHub Pages compatibility.)
- **Audio** (`src/lib/audio.ts`): all music and SFX are synthesized live with the Web Audio API — oscillators, filters, noise buffers, a lookahead scheduler. No audio files to ship.
- **Particles** (`ParticleLayer.tsx`): a single full-screen canvas listening for `fx:burst` and `fx:confetti` window events; the game dispatches bursts at merge cell centers.

---

## 🛠️ Tech stack

- **Next.js 16** (App Router, static export)
- **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** component primitives
- **Web Audio API** for music & SFX
- **Canvas** for particle effects and color sampling
- Fonts: **Chewy** + **Patrick Hand** (via `next/font/google`, bundled at build time — works offline)

---

## 📄 License

MIT — see [LICENSE](./LICENSE). The placeholder animal photos are loaded from a public image CDN for demo purposes; replace them with your own before redistributing.

---

Made with love. Swap in your friend's pics and watch the room lose it when the final photo pops. 🎉
