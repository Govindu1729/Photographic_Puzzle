"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import ParticleLayer from "@/components/ParticleLayer"
import {
  PHOTO_CHAIN,
  FALLBACK_COLORS,
  chainFor,
} from "@/lib/photo-chain"
import { THEMES, getTheme } from "@/lib/themes"
import {
  MUSIC_STYLES,
  SFX_PACKS,
  VibeAudio,
  type MusicStyle,
  type SfxPack,
} from "@/lib/audio"
import {
  type Tile,
  type Direction,
  type BoardSize,
  BOARD_SIZES,
  newGame,
  move as doMove,
} from "@/lib/game"

function hexToRgba(hex: string, alpha: number) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/* ---- leaderboard (local, works on any static host) ---- */
interface LbEntry {
  name: string
  score: number
  won: boolean
  date: string
  photos: number
}

function loadLeaderboard(): LbEntry[] {
  try {
    const raw = localStorage.getItem("photomerge-leaderboard")
    if (!raw) return []
    const list = JSON.parse(raw)
    return Array.isArray(list) ? list.slice(0, 10) : []
  } catch {
    return []
  }
}

/* Deterministic starting board so SSR and client render identically. */
function initialTiles(size: number): Tile[] {
  return [1, 2].map((id, i) => ({
    id,
    level: 0,
    row: size - 1 - i,
    col: (i * 2 + 1) % size,
    isNew: true,
  }))
}

/* Client-side color extraction fallback (used when the server API is absent,
 * e.g. when the game is statically hosted on GitHub Pages with local images). */
function clientDominantColor(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new window.Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      try {
        const c = document.createElement("canvas")
        c.width = 16
        c.height = 16
        const ctx = c.getContext("2d")
        if (!ctx) return resolve(null)
        ctx.drawImage(img, 0, 0, 16, 16)
        const d = ctx.getImageData(0, 0, 16, 16).data
        let r = 0,
          g = 0,
          b = 0,
          n = 0
        for (let i = 0; i < d.length; i += 4) {
          const max = Math.max(d[i], d[i + 1], d[i + 2])
          const min = Math.min(d[i], d[i + 1], d[i + 2])
          if (max < 40 || min > 230) continue
          r += d[i]
          g += d[i + 1]
          b += d[i + 2]
          n++
        }
        if (!n) return resolve(null)
        const h = (v: number) =>
          Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")
        resolve(`#${h(r / n + 18)}${h(g / n + 18)}${h(b / n + 18)}`)
      } catch {
        resolve(null) // CORS-tainted canvas
      }
    }
    img.onerror = () => resolve(null)
    img.src = url
  })
}

export default function PhotoMergeGame() {
  const [boardSize, setBoardSize] = useState<BoardSize>(4)
  const [difficulty] = useState(12) // Fixed difficulty - full journey to Meghu's Day
  const [tiles, setTiles] = useState<Tile[]>(() => initialTiles(4))
  const [dying, setDying] = useState<Tile[]>([])
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(0)
  const [won, setWon] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [colors, setColors] = useState<string[]>(FALLBACK_COLORS)
  const [musicOn, setMusicOn] = useState(false)
  const [sfxOn, setSfxOn] = useState(true)
  const [lastMerge, setLastMerge] = useState<{ level: number; key: number } | null>(null)
  const [showCollage, setShowCollage] = useState(false) // For collage modal

  // settings (persisted)
  const [musicStyle, setMusicStyle] = useState<MusicStyle>("lofi")
  const [sfxPack, setSfxPack] = useState<SfxPack>("pop")
  const [themeId, setThemeId] = useState("strawberry")

  // leaderboard
  const [leaderboard, setLeaderboard] = useState<LbEntry[]>([])
  const [playerName, setPlayerName] = useState("")
  const [scoreSaved, setScoreSaved] = useState(false)

  const theme = getTheme(themeId)
  const chain = chainFor(difficulty)
  const winLevel = chain.length - 1

  const boardRef = useRef<HTMLDivElement>(null)
  const busyRef = useRef(false)

  const [audio] = useState<VibeAudio | null>(() =>
    typeof window === "undefined" ? null : new VibeAudio()
  )

  // Load persisted settings + best score after mount (client-only values)
  useEffect(() => {
    const b = Number(localStorage.getItem("photomerge-best") || 0)
    if (b) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBest(b)
    }
    const savedSize = Number(localStorage.getItem("photomerge-size")) as BoardSize
    if (BOARD_SIZES.includes(savedSize)) {
       
      setBoardSize(savedSize)
       
      setTiles(initialTiles(savedSize))
    }
    const savedStyle = localStorage.getItem("photomerge-music") as MusicStyle | null
    if (savedStyle && MUSIC_STYLES.some((m) => m.id === savedStyle)) {
       
      setMusicStyle(savedStyle)
    }
    const savedPack = localStorage.getItem("photomerge-sfx") as SfxPack | null
    if (savedPack && SFX_PACKS.some((p) => p.id === savedPack)) {
       
      setSfxPack(savedPack)
    }
    const savedTheme = localStorage.getItem("photomerge-theme")
    if (savedTheme && THEMES.some((t) => t.id === savedTheme)) {
       
      setThemeId(savedTheme)
    }
     
    setLeaderboard(loadLeaderboard())
  }, [])

  // Fetch the dominant color of every photo. Server API first, then a
  // client-side canvas attempt (for static hosting), then the fallback palette.
  useEffect(() => {
    let cancelled = false
    Promise.all(
      PHOTO_CHAIN.map(async (p) => {
        try {
          const r = await fetch(`/api/dominant-color?url=${encodeURIComponent(p.url)}`)
          const d = (await r.json()) as { color?: string }
          if (d.color && /^#[0-9a-fA-F]{6}$/.test(d.color)) return d.color
        } catch {
          /* fall through */
        }
        return (await clientDominantColor(p.url)) ?? null
      })
    ).then((list) => {
      if (cancelled) return
      setColors(
        PHOTO_CHAIN.map((_, i) =>
          list[i] && typeof list[i] === "string" ? (list[i] as string) : FALLBACK_COLORS[i]
        )
      )
    })
    return () => {
      cancelled = true
    }
  }, [])

  const highestLevel = tiles.reduce((m, t) => Math.max(m, t.level), 0)

  const burstAt = useCallback(
    (row: number, col: number, color: string) => {
      const board = boardRef.current
      if (!board) return
      const rect = board.getBoundingClientRect()
      const x = rect.left + ((col + 0.5) / boardSize) * rect.width
      const y = rect.top + ((row + 0.5) / boardSize) * rect.height
      window.dispatchEvent(new CustomEvent("fx:burst", { detail: { x, y, color } }))
    },
    [boardSize]
  )

  const doMoveWrapper = useCallback(
    (dir: Direction) => {
      if (busyRef.current || won || gameOver) return
      busyRef.current = true
      const res = doMove(tiles, dir, winLevel, boardSize)
      if (!res.moved) {
        busyRef.current = false
        return
      }
      setTiles(res.tiles)
      setDying(res.dying)
      const newScore = score + res.scoreGained
      setScore(newScore)
      if (newScore > best) {
        setBest(newScore)
        localStorage.setItem("photomerge-best", String(newScore))
      }
      setTimeout(() => {
        setDying([])
        setTiles((cur) => cur.map((t) => ({ ...t, isNew: false, merged: false })))
        busyRef.current = false
      }, 180)

      if (res.mergeEvents.length > 0) {
        audio?.mergeSfx(res.mergeEvents[0].newLevel)
        for (const ev of res.mergeEvents) {
          burstAt(ev.row, ev.col, colors[ev.newLevel] ?? FALLBACK_COLORS[ev.newLevel])
        }
        setLastMerge({ level: res.mergeEvents[0].newLevel, key: Date.now() })
      } else {
        audio?.spawnSfx()
      }

      if (res.win) {
        setWon(true)
        audio?.winSfx()
        // MASSIVE confetti celebration for Meghu's Day!
        window.dispatchEvent(new CustomEvent("fx:confetti", { detail: { duration: 10000 } }))
      } else if (res.gameOver) {
        setGameOver(true)
      }
    },
    [tiles, won, gameOver, colors, audio, score, best, boardSize, burstAt, winLevel]
  )

  // keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right",
      }
      const dir = map[e.key]
      if (dir) {
        e.preventDefault()
        doMoveWrapper(dir)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [doMoveWrapper])

  // touch swipe
  const touchRef = useRef<{ x: number; y: number } | null>(null)
  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchRef.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchRef.current
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return
    if (Math.abs(dx) > Math.abs(dy)) doMoveWrapper(dx > 0 ? "right" : "left")
    else doMoveWrapper(dy > 0 ? "down" : "up")
    touchRef.current = null
  }

  const restart = (size: BoardSize = boardSize) => {
    setTiles(newGame(size))
    setDying([])
    setScore(0)
    setWon(false)
    setGameOver(false)
    setLastMerge(null)
    setScoreSaved(false)
    setShowCollage(false)
  }

  const changeBoardSize = (size: BoardSize) => {
    setBoardSize(size)
    localStorage.setItem("photomerge-size", String(size))
    restart(size)
  }

  const changeMusicStyle = (style: MusicStyle) => {
    setMusicStyle(style)
    localStorage.setItem("photomerge-music", style)
    audio?.setMusicStyle(style)
  }

  const changeSfxPack = (pack: SfxPack) => {
    setSfxPack(pack)
    localStorage.setItem("photomerge-sfx", pack)
    audio?.setSfxPack(pack)
  }

  const changeTheme = (id: string) => {
    setThemeId(id)
    localStorage.setItem("photomerge-theme", id)
  }

  const toggleMusic = () => {
    if (!audio) return
    if (musicOn) {
      audio.stopMusic()
      setMusicOn(false)
    } else {
      audio.setMusicStyle(musicStyle)
      audio.startMusic()
      setMusicOn(true)
    }
  }

  const toggleSfx = () => {
    if (!audio) return
    audio.setSfx(!sfxOn)
    setSfxOn(!sfxOn)
  }

  const saveScore = () => {
    const name = playerName.trim().slice(0, 14) || "Anonymous Cutie"
    const entry: LbEntry = {
      name,
      score,
      won,
      date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      photos: difficulty,
    }
    const list = [...leaderboard, entry].sort((a, b) => b.score - a.score).slice(0, 10)
    setLeaderboard(list)
    localStorage.setItem("photomerge-leaderboard", JSON.stringify(list))
    setScoreSaved(true)
  }

  const heroColor = colors[highestLevel] ?? FALLBACK_COLORS[highestLevel]
  const pct = 100 / boardSize

  const panelStyle = {
    background: theme.panelBg,
    border: `2px dashed ${theme.panelBorder}`,
  }

  return (
    <div
      className="paper-texture flex min-h-screen flex-col items-center px-4 pb-8 pt-6 transition-colors duration-700"
      style={{
        background: `radial-gradient(1200px 800px at 50% -10%, ${hexToRgba(
          heroColor,
          themeId === "midnight" ? 0.25 : 0.35
        )}, ${theme.pageBase} 60%)`,
        color: theme.text,
      }}
    >
      <ParticleLayer />

      <main className="font-hand flex w-full max-w-md flex-col gap-4">
        {/* Header — scrapbook title with tape */}
        <header className="relative text-center">
          <div className="washi -top-1 left-1/2 z-10 -translate-x-1/2 -rotate-3" style={{ background: theme.accent }} />
          <h1 className="font-display mt-2 text-4xl tracking-tight" style={{ color: theme.text }}>
            PhotoMerge
          </h1>
          <p className="mt-1 text-base" style={{ color: theme.textSoft }}>
            merge the pics, unlock the cuteness ✿
          </p>
        </header>

        {/* Scoreboard — sticker tags */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            <div
              className="tilt-hover -rotate-2 rounded-lg px-4 py-2 text-center shadow-md"
              style={{ background: theme.panelBg, border: `2px solid ${theme.panelBorder}` }}
            >
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.textSoft }}>
                score
              </div>
              <div className="font-display text-xl" style={{ color: theme.text }}>{score}</div>
            </div>
            <div
              className="tilt-hover rotate-1 rounded-lg px-4 py-2 text-center shadow-md"
              style={{ background: theme.panelBg, border: `2px solid ${theme.panelBorder}` }}
            >
              <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: theme.textSoft }}>
                best
              </div>
              <div className="font-display text-xl" style={{ color: theme.text }}>{best}</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              aria-label={musicOn ? "Mute music" : "Play music"}
              title={musicOn ? "Mute music" : "Play music"}
              onClick={toggleMusic}
              className="sticker-btn h-10 w-10 rounded-full"
              style={{ background: theme.panelBg, borderColor: theme.panelBorder }}
            >
              {musicOn ? "🔊" : "🔇"}
            </Button>
            <Button
              size="icon"
              variant="outline"
              aria-label={sfxOn ? "Disable sound effects" : "Enable sound effects"}
              title={sfxOn ? "Disable sound effects" : "Enable sound effects"}
              onClick={toggleSfx}
              className="sticker-btn h-10 w-10 rounded-full"
              style={{ background: theme.panelBg, borderColor: theme.panelBorder }}
            >
              {sfxOn ? "🔔" : "🔕"}
            </Button>
            <Button
              onClick={() => restart()}
              className="font-display sticker-btn rounded-xl px-5 text-white"
              style={{ background: theme.accent }}
            >
              New Game
            </Button>
          </div>
        </div>

        {/* Last merge banner — handwritten note */}
        {lastMerge && !won && (
          <div
            key={lastMerge.key}
            className="font-hand wobbly px-4 py-2 text-center text-base shadow-sm"
            style={{
              background: theme.panelBg,
              color: theme.text,
              borderColor: colors[lastMerge.level],
            }}
          >
            ✿ unlocked <b>{chain[lastMerge.level].name}</b>! ✿
          </div>
        )}

        {/* Board — corkboard style */}
        <div
          ref={boardRef}
          className="relative mx-auto aspect-square w-full touch-none select-none rounded-2xl p-2 shadow-md"
          style={{
            background: theme.boardBg,
            border: `3px solid ${theme.panelBorder}`,
            borderRadius: "22px 18px 24px 20px / 18px 24px 20px 22px",
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          role="application"
          aria-label="Photo merge puzzle board, use arrow keys or swipe to move tiles"
        >
          <div
            className="grid h-full w-full gap-2"
            style={{
              gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
              gridTemplateRows: `repeat(${boardSize}, 1fr)`,
            }}
          >
            {Array.from({ length: boardSize * boardSize }).map((_, i) => (
              <div
                key={i}
                className="rounded-lg"
                style={{ background: theme.cellBg, border: `1px dashed ${theme.panelBorder}` }}
              />
            ))}
          </div>

          <div className="absolute inset-2">
            {tiles.map((tile) => (
              <TileView key={tile.id} tile={tile} pct={pct} color={colors[tile.level]} />
            ))}
            {dying.map((tile) => (
              <TileView key={`dying-${tile.id}`} tile={tile} pct={pct} color={colors[tile.level]} />
            ))}
          </div>

          {/* Win overlay — polaroid reveal for Meghu's Day */}
          {won && (
            <OverlayCard theme={theme} tapeColor={colors[winLevel]}>
              <div className="polaroid mx-auto w-40 rotate-2 cursor-pointer" style={{ animation: "reveal-zoom 0.7s ease" }} onClick={() => setShowCollage(true)}>
                <Image
                  src={chain[winLevel].url}
                  alt={chain[winLevel].name}
                  width={320}
                  height={320}
                  className="h-full w-full rounded-sm object-cover"
                  unoptimized
                />
                <div className="font-hand mt-1 text-center text-xs" style={{ color: "#5b4a3f" }}>
                  click for full collage!
                </div>
              </div>
              <p className="font-display mt-3 text-center text-2xl font-bold" style={{ color: theme.text }}>
                🎉 It&apos;s Meghu&apos;s Day! 🎉
              </p>
              <p className="font-hand text-center text-sm" style={{ color: theme.textSoft }}>
                Happy Birthday little pup! 🐾
              </p>
              <SaveScoreForm
                theme={theme}
                saved={scoreSaved}
                playerName={playerName}
                setPlayerName={setPlayerName}
                onSave={saveScore}
              />
              <Button
                onClick={() => restart()}
                className="font-display sticker-btn mt-1 rounded-xl px-6 text-white"
                style={{ background: theme.accent }}
              >
                Play Again
              </Button>
            </OverlayCard>
          )}

          {/* Game over overlay */}
          {gameOver && !won && (
            <OverlayCard theme={theme} tapeColor={colors[highestLevel]}>
              <p className="font-display text-center text-xl" style={{ color: theme.text }}>
                no moves left 😿
              </p>
              <p className="font-hand mt-1 text-center text-base" style={{ color: theme.textSoft }}>
                you reached <b>{chain[highestLevel].name}</b> · score {score}
              </p>
              <SaveScoreForm
                theme={theme}
                saved={scoreSaved}
                playerName={playerName}
                setPlayerName={setPlayerName}
                onSave={saveScore}
              />
              <Button
                onClick={() => restart()}
                className="font-display sticker-btn mt-1 rounded-xl px-6 text-white"
                style={{ background: theme.accent }}
              >
                Try Again
              </Button>
            </OverlayCard>
          )}
        </div>

        {/* Progress chain — mini polaroids on a string (only show achieved photos) */}
        <section aria-label="Photo chain progress">
          <h2 className="font-hand mb-2 text-center text-sm" style={{ color: theme.textSoft }}>
            ✂︎ the cuteness chain ✂︎
          </h2>
          <div
            className="flex flex-wrap items-start justify-center gap-2 rounded-2xl p-3"
            style={panelStyle}
          >
            {chain.map((p, i) => {
              const reached = i <= highestLevel
              // Only show achieved photos, hide upcoming ones completely
              if (!reached) return null
              
              const tilt = ((i * 7) % 9) - 4
              return (
                <div
                  key={p.level}
                  className="polaroid relative transition-all duration-300"
                  style={{
                    transform: `rotate(${tilt}deg) scale(1)`,
                    opacity: 1,
                  }}
                  title={p.name}
                >
                  <div
                    className="h-9 w-9 overflow-hidden rounded-sm"
                    style={{ boxShadow: `0 0 0 3px ${hexToRgba(colors[i], 0.7)}` }}
                  >
                    <Image
                      src={p.url}
                      alt={p.name}
                      width={72}
                      height={72}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Settings — recipe card (difficulty hidden, other settings remain) */}
        <section
          className="wobbly p-4"
          style={panelStyle}
          aria-label="Game settings"
        >
          <h2 className="font-display mb-3 text-lg" style={{ color: theme.text }}>
            ⚙ make it yours
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-xs font-bold" style={{ color: theme.textSoft }}>
              board size
              <Select
                value={String(boardSize)}
                onValueChange={(v) => changeBoardSize(Number(v) as BoardSize)}
              >
                <SelectTrigger className="font-hand h-9 w-full bg-white/70 text-sm dark:bg-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3×3 — quick bite</SelectItem>
                  <SelectItem value="4">4×4 — classic</SelectItem>
                  <SelectItem value="5">5×5 — marathon</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold" style={{ color: theme.textSoft }}>
              theme
              <Select value={themeId} onValueChange={changeTheme}>
                <SelectTrigger className="font-hand h-9 w-full bg-white/70 text-sm dark:bg-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEMES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.emoji} {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold" style={{ color: theme.textSoft }}>
              music station
              <Select value={musicStyle} onValueChange={(v) => changeMusicStyle(v as MusicStyle)}>
                <SelectTrigger className="font-hand h-9 w-full bg-white/70 text-sm dark:bg-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MUSIC_STYLES.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.emoji} {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
            <label className="flex flex-col gap-1 text-xs font-bold" style={{ color: theme.textSoft }}>
              sound effects
              <Select value={sfxPack} onValueChange={(v) => changeSfxPack(v as SfxPack)}>
                <SelectTrigger className="font-hand h-9 w-full bg-white/70 text-sm dark:bg-white/10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SFX_PACKS.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.emoji} {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </div>
          <p className="mt-2 text-xs" style={{ color: theme.textSoft }}>
            changing board size starts a fresh game
          </p>
        </section>

        {/* Hall of Fame — local leaderboard */}
        <section className="wobbly p-4" style={panelStyle} aria-label="Hall of fame leaderboard">
          <h2 className="font-display mb-2 text-lg" style={{ color: theme.text }}>
            ★ hall of fame
          </h2>
          {leaderboard.length === 0 ? (
            <p className="text-sm" style={{ color: theme.textSoft }}>
              no scores yet — finish a game and sign the wall! ✍️
            </p>
          ) : (
            <ol className="space-y-1">
              {leaderboard.map((e, i) => (
                <li
                  key={`${e.name}-${e.date}-${e.score}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1 text-sm"
                  style={{
                    background: i % 2 === 0 ? theme.cellBg : "transparent",
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span className="font-display w-6 text-center" style={{ color: theme.textSoft }}>
                      {i + 1}.
                    </span>
                    <span style={{ color: theme.text }}>{e.name}</span>
                    {e.won && <span title="Reached the big reveal">👑</span>}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-[10px]" style={{ color: theme.textSoft }}>
                      {e.date}
                    </span>
                    <span className="font-display" style={{ color: theme.text }}>
                      {e.score}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <p className="mt-2 text-[10px]" style={{ color: theme.textSoft }}>
            saved in this browser only (works anywhere, even offline on GitHub Pages)
          </p>
        </section>

        {/* How to play — sticky note */}
        <section
          className="stitched -rotate-1 p-4 text-sm"
          style={{ background: theme.panelBg, color: theme.textSoft }}
        >
          <h2 className="font-display mb-1 text-base" style={{ color: theme.text }}>
            how to play
          </h2>
          <ul className="list-inside list-disc space-y-0.5">
            <li>arrow keys / WASD or swipe to slide</li>
            <li>two matching photos merge into the next cuter one</li>
            <li>
              merge two Meghus to reveal <b>the big collage</b> — click it to see full size!
            </li>
          </ul>
        </section>

        <footer className="font-hand mt-auto pt-2 text-center text-xs" style={{ color: theme.textSoft }}>
          made with love · effect colors are sampled from your photos · celebrating Meghu&apos;s special day! 🐾
        </footer>
      </main>

      {/* Collage Modal — shows full size collage when clicked */}
      {showCollage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          onClick={() => setShowCollage(false)}
        >
          <div className="relative max-h-[90vh] max-w-[90vw]" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowCollage(false)}
              className="absolute -right-2 -top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white text-black shadow-lg hover:bg-gray-200"
              aria-label="Close collage"
            >
              ✕
            </button>
            <Image
              src="/meghu-collage.jpeg"
              alt="Meghu's Cute Collage"
              width={600}
              height={600}
              className="max-h-[85vh] w-auto rounded-lg object-contain"
              unoptimized
            />
            <p className="mt-3 text-center text-lg font-bold text-white">
              🎉 It&apos;s Meghu&apos;s Day! 🎉
            </p>
            <p className="text-center text-sm text-white/80">
              Happy Birthday sweet puppy! 🐾
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ---- overlay card (scrapbook page) ---- */
function OverlayCard({
  children,
  theme,
  tapeColor,
}: {
  children: React.ReactNode
  theme: ReturnType<typeof getTheme>
  tapeColor: string
}) {
  return (
    <div
      className="absolute inset-0 z-40 flex flex-col items-center justify-center gap-2 rounded-2xl p-4 backdrop-blur-sm"
      style={{ background: theme.overlayBg }}
    >
      <div className="washi -top-1 left-1/2 -translate-x-1/2 -rotate-6" style={{ background: tapeColor }} />
      <div className="wobbly flex flex-col items-center gap-2 p-4" style={{ background: theme.panelBg }}>
        {children}
      </div>
    </div>
  )
}

/* ---- save-score form ---- */
function SaveScoreForm({
  theme,
  saved,
  playerName,
  setPlayerName,
  onSave,
}: {
  theme: ReturnType<typeof getTheme>
  saved: boolean
  playerName: string
  setPlayerName: (v: string) => void
  onSave: () => void
}) {
  if (saved) {
    return (
      <p className="font-hand text-sm" style={{ color: theme.textSoft }}>
        signed! ✍️
      </p>
    )
  }
  return (
    <div className="mt-1 flex w-full max-w-[240px] items-center gap-2">
      <Input
        value={playerName}
        onChange={(e) => setPlayerName(e.target.value)}
        placeholder="your name…"
        maxLength={14}
        aria-label="Your name for the leaderboard"
        className="font-hand h-9 flex-1 bg-white/80 text-sm"
      />
      <Button
        size="sm"
        onClick={onSave}
        className="font-display sticker-btn h-9 rounded-lg text-white"
        style={{ background: theme.accent }}
      >
        Sign
      </Button>
    </div>
  )
}

/* ---- tile: a little polaroid ---- */
function TileView({ tile, pct, color }: { tile: Tile; pct: number; color?: string }) {
  const photo = PHOTO_CHAIN[tile.level]
  const c = color ?? FALLBACK_COLORS[tile.level]
  const anim = tile.dying
    ? "tile-dying 0.18s ease forwards"
    : tile.merged
      ? "tile-pop 0.22s ease"
      : tile.isNew
        ? "tile-spawn 0.18s ease"
        : undefined
  // deterministic hand-placed tilt per tile
  const tilt = ((tile.id * 13) % 7) - 3

  return (
    <div
      className="absolute transition-[left,top] duration-150 ease-in-out"
      style={{
        left: `calc(${tile.col * pct}% + 3px)`,
        top: `calc(${tile.row * pct}% + 3px)`,
        width: `calc(${pct}% - 6px)`,
        height: `calc(${pct}% - 6px)`,
        zIndex: tile.dying ? 5 : tile.merged ? 10 : 6,
        animation: anim,
      }}
    >
      <div
        className="polaroid flex h-full w-full flex-col"
        style={{ transform: `rotate(${tilt}deg)`, boxShadow: `0 0 0 2px ${hexToRgba(c, 0.8)}, 0 4px 10px ${hexToRgba(c, 0.4)}` }}
      >
        <div className="relative min-h-0 flex-1 overflow-hidden rounded-sm">
          <Image
            src={photo.url}
            alt={photo.name}
            fill
            sizes="(max-width: 448px) 88vw, 400px"
            className="object-cover"
            unoptimized
          />
        </div>
        <div
          className="font-hand truncate px-0.5 pb-0.5 pt-0.5 text-center text-[9px] leading-tight"
          style={{ color: "#5b4a3f" }}
        >
          {photo.name}
        </div>
      </div>
    </div>
  )
}
