/* Procedural music + SFX via Web Audio API. No external audio files.
 *
 * Music stations:
 *  - "lofi":   warm chord pads, lazy melody, soft kick/hat, vinyl crackle
 *  - "dream":  slow airy ambient pads, sparse bells, no drums
 *  - "arcade": upbeat chiptune — square lead, driving kick & hats
 *
 * SFX packs: "pop" (triangle plucks), "chime" (glass bells), "retro" (8-bit blips)
 */

export type MusicStyle = "lofi" | "dream" | "arcade"
export type SfxPack = "pop" | "chime" | "retro"

export const MUSIC_STYLES: { id: MusicStyle; label: string; emoji: string }[] = [
  { id: "lofi", label: "Lo-Fi Beats", emoji: "🎧" },
  { id: "dream", label: "Dream Ambient", emoji: "🌙" },
  { id: "arcade", label: "Arcade Chiptune", emoji: "🕹️" },
]

export const SFX_PACKS: { id: SfxPack; label: string; emoji: string }[] = [
  { id: "pop", label: "Bubble Pop", emoji: "🫧" },
  { id: "chime", label: "Glass Chime", emoji: "🔔" },
  { id: "retro", label: "Retro 8-Bit", emoji: "🎮" },
]

type Chord = number[] // MIDI note numbers

const LOFI_CHORDS: Chord[] = [
  [48, 55, 60, 64], // Cmaj7
  [45, 52, 57, 64], // Am7
  [41, 48, 53, 60], // Fmaj7
  [43, 50, 55, 62], // G7-ish
]

const DREAM_CHORDS: Chord[] = [
  [40, 47, 52, 59, 64], // Em add9-ish
  [43, 50, 55, 62, 67], // G
  [45, 52, 57, 60, 69], // Am add
  [38, 45, 50, 57, 62], // D-ish
]

const ARCADE_CHORDS: Chord[] = [
  [45, 52, 57, 60], // Am
  [41, 48, 53, 57], // F
  [48, 55, 60, 64], // C
  [43, 50, 55, 59], // G
]

const MELODY_SCALE = [60, 62, 64, 67, 69, 72, 74, 76, 79, 81]

function midiToFreq(m: number) {
  return 440 * Math.pow(2, (m - 69) / 12)
}

const BAR_SECONDS: Record<MusicStyle, number> = {
  lofi: 2.0,
  dream: 3.2,
  arcade: 1.2,
}

export class VibeAudio {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private musicFilter: BiquadFilterNode | null = null
  private timer: ReturnType<typeof setInterval> | null = null
  private nextBarTime = 0
  private bar = 0
  private playingMusic = false
  private sfxOn = true
  private musicStyle: MusicStyle = "lofi"
  private sfxPack: SfxPack = "pop"

  private ensureCtx() {
    if (!this.ctx) {
      const AC =
        (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
          .AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      this.ctx = new AC()
      this.master = this.ctx.createGain()
      this.master.gain.value = 0.9
      this.master.connect(this.ctx.destination)
      this.musicGain = this.ctx.createGain()
      this.musicGain.gain.value = 0.5
      this.musicFilter = this.ctx.createBiquadFilter()
      this.musicFilter.type = "lowpass"
      this.musicFilter.frequency.value = 2200
      this.musicGain.connect(this.musicFilter)
      this.musicFilter.connect(this.master)
    }
    if (this.ctx.state === "suspended") this.ctx.resume()
    return this.ctx
  }

  /* ---------------- Music ---------------- */

  get musicPlaying() {
    return this.playingMusic
  }

  setMusicStyle(style: MusicStyle) {
    this.musicStyle = style
    // smoother/darker filter for dream, brighter for arcade
    if (this.musicFilter) {
      this.musicFilter.frequency.value = style === "dream" ? 1200 : style === "arcade" ? 5200 : 2200
    }
    // restart the scheduler so the new style kicks in immediately
    if (this.playingMusic) {
      this.stopMusic()
      this.startMusic()
    }
  }

  startMusic() {
    const ctx = this.ensureCtx()
    if (!ctx || this.playingMusic) return
    this.playingMusic = true
    this.nextBarTime = ctx.currentTime + 0.1
    // lookahead scheduler
    this.timer = setInterval(() => {
      while (this.nextBarTime < ctx.currentTime + 0.5) {
        this.scheduleBar(this.nextBarTime, this.bar)
        this.bar++
        this.nextBarTime += BAR_SECONDS[this.musicStyle]
      }
    }, 200)
  }

  stopMusic() {
    this.playingMusic = false
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  setMusicVolume(v: number) {
    this.ensureCtx()
    if (this.musicGain) this.musicGain.gain.value = v
  }

  private scheduleBar(t: number, bar: number) {
    switch (this.musicStyle) {
      case "dream":
        this.scheduleDreamBar(t, bar)
        break
      case "arcade":
        this.scheduleArcadeBar(t, bar)
        break
      default:
        this.scheduleLofiBar(t, bar)
    }
  }

  /* --- lo-fi --- */
  private scheduleLofiBar(t: number, bar: number) {
    const ctx = this.ctx!
    const chord = LOFI_CHORDS[bar % LOFI_CHORDS.length]

    chord.forEach((note, i) => {
      const o = ctx.createOscillator()
      o.type = i === 0 ? "sine" : "triangle"
      o.frequency.value = midiToFreq(note)
      o.detune.value = (Math.random() - 0.5) * 8
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.09 / (i + 1), t + 0.7)
      g.gain.linearRampToValueAtTime(0.0001, t + 2.05)
      o.connect(g)
      g.connect(this.musicGain!)
      o.start(t)
      o.stop(t + 2.1)
    })

    if (bar % 2 === 0 || Math.random() < 0.6) {
      const noteCount = 1 + Math.floor(Math.random() * 2)
      for (let n = 0; n < noteCount; n++) {
        const note = MELODY_SCALE[Math.floor(Math.random() * MELODY_SCALE.length)]
        const mt = t + 0.25 + Math.random() * 1.2
        const o = ctx.createOscillator()
        o.type = "sine"
        o.frequency.value = midiToFreq(note + 12)
        const g = ctx.createGain()
        g.gain.setValueAtTime(0, mt)
        g.gain.linearRampToValueAtTime(0.06, mt + 0.02)
        g.gain.exponentialRampToValueAtTime(0.0001, mt + 0.8)
        o.connect(g)
        g.connect(this.musicGain!)
        o.start(mt)
        o.stop(mt + 0.85)
      }
    }

    for (const bt of [0, 1.0]) {
      const o = ctx.createOscillator()
      o.type = "sine"
      o.frequency.setValueAtTime(120, t + bt)
      o.frequency.exponentialRampToValueAtTime(45, t + bt + 0.12)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.22, t + bt)
      g.gain.exponentialRampToValueAtTime(0.0001, t + bt + 0.22)
      o.connect(g)
      g.connect(this.musicGain!)
      o.start(t + bt)
      o.stop(t + bt + 0.25)
    }

    for (let e = 0; e < 8; e++) {
      const et = t + e * 0.25
      if (e % 2 === 1 && Math.random() < 0.7) {
        const buf = this.noiseBuffer(0.06)
        const src = ctx.createBufferSource()
        src.buffer = buf
        const hp = ctx.createBiquadFilter()
        hp.type = "highpass"
        hp.frequency.value = 6000
        const g = ctx.createGain()
        g.gain.setValueAtTime(0.03, et)
        g.gain.exponentialRampToValueAtTime(0.0001, et + 0.06)
        src.connect(hp)
        hp.connect(g)
        g.connect(this.musicGain!)
        src.start(et)
      }
    }

    const crackle = this.noiseBuffer(2.0)
    const src = ctx.createBufferSource()
    src.buffer = crackle
    const g = ctx.createGain()
    const hp = ctx.createBiquadFilter()
    hp.type = "highpass"
    hp.frequency.value = 3000
    g.gain.value = 0.008
    src.connect(hp)
    hp.connect(g)
    g.connect(this.musicGain!)
    src.start(t)
  }

  /* --- dream ambient --- */
  private scheduleDreamBar(t: number, bar: number) {
    const ctx = this.ctx!
    const chord = DREAM_CHORDS[bar % DREAM_CHORDS.length]
    const dur = BAR_SECONDS.dream

    // very slow, airy pads
    chord.forEach((note, i) => {
      const o = ctx.createOscillator()
      o.type = "sine"
      o.frequency.value = midiToFreq(note)
      o.detune.value = (Math.random() - 0.5) * 14
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.07 / (i + 1), t + dur * 0.45)
      g.gain.linearRampToValueAtTime(0.0001, t + dur + 0.1)
      o.connect(g)
      g.connect(this.musicGain!)
      o.start(t)
      o.stop(t + dur + 0.15)
    })

    // sparse glass bells
    if (Math.random() < 0.75) {
      const note = MELODY_SCALE[Math.floor(Math.random() * MELODY_SCALE.length)] + 12
      const mt = t + Math.random() * dur * 0.7
      const o = ctx.createOscillator()
      o.type = "sine"
      o.frequency.value = midiToFreq(note)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, mt)
      g.gain.linearRampToValueAtTime(0.055, mt + 0.03)
      g.gain.exponentialRampToValueAtTime(0.0001, mt + 2.2)
      o.connect(g)
      g.connect(this.musicGain!)
      o.start(mt)
      o.stop(mt + 2.3)
      // octave shimmer
      const o2 = ctx.createOscillator()
      o2.type = "sine"
      o2.frequency.value = midiToFreq(note + 12)
      const g2 = ctx.createGain()
      g2.gain.setValueAtTime(0, mt + 0.06)
      g2.gain.linearRampToValueAtTime(0.02, mt + 0.09)
      g2.gain.exponentialRampToValueAtTime(0.0001, mt + 1.6)
      o2.connect(g2)
      g2.connect(this.musicGain!)
      o2.start(mt + 0.06)
      o2.stop(mt + 1.7)
    }

    // soft ocean-ish wash every other bar
    if (bar % 2 === 0) {
      const buf = this.noiseBuffer(dur)
      const src = ctx.createBufferSource()
      src.buffer = buf
      const lp = ctx.createBiquadFilter()
      lp.type = "lowpass"
      lp.frequency.value = 500
      const g = ctx.createGain()
      g.gain.setValueAtTime(0, t)
      g.gain.linearRampToValueAtTime(0.015, t + dur * 0.5)
      g.gain.linearRampToValueAtTime(0.0001, t + dur)
      src.connect(lp)
      lp.connect(g)
      g.connect(this.musicGain!)
      src.start(t)
    }
  }

  /* --- arcade chiptune --- */
  private scheduleArcadeBar(t: number, bar: number) {
    const ctx = this.ctx!
    const chord = ARCADE_CHORDS[bar % ARCADE_CHORDS.length]
    const dur = BAR_SECONDS.arcade

    // square-wave bass pulse (root, octave)
    const root = chord[0] - 12
    for (let e = 0; e < 4; e++) {
      const bt = t + e * (dur / 4)
      const o = ctx.createOscillator()
      o.type = "square"
      o.frequency.value = midiToFreq(e % 2 === 0 ? root : root + 12)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.05, bt)
      g.gain.exponentialRampToValueAtTime(0.0001, bt + dur / 4 * 0.85)
      o.connect(g)
      g.connect(this.musicGain!)
      o.start(bt)
      o.stop(bt + dur / 4)
    }

    // chiptune arpeggio lead on 16ths
    const arp = [...chord, chord[1] + 12, chord[2] + 12]
    for (let s = 0; s < 8; s++) {
      const st = t + s * (dur / 8)
      if (Math.random() < 0.85) {
        const o = ctx.createOscillator()
        o.type = "square"
        o.frequency.value = midiToFreq(arp[s % arp.length] + 12)
        const g = ctx.createGain()
        g.gain.setValueAtTime(0, st)
        g.gain.linearRampToValueAtTime(0.035, st + 0.01)
        g.gain.exponentialRampToValueAtTime(0.0001, st + 0.14)
        o.connect(g)
        g.connect(this.musicGain!)
        o.start(st)
        o.stop(st + 0.16)
      }
    }

    // driving kick every quarter
    for (let e = 0; e < 4; e++) {
      const bt = t + e * (dur / 4)
      const o = ctx.createOscillator()
      o.type = "sine"
      o.frequency.setValueAtTime(150, bt)
      o.frequency.exponentialRampToValueAtTime(50, bt + 0.08)
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.16, bt)
      g.gain.exponentialRampToValueAtTime(0.0001, bt + 0.12)
      o.connect(g)
      g.connect(this.musicGain!)
      o.start(bt)
      o.stop(bt + 0.14)
    }

    // hats every 8th
    for (let e = 0; e < 8; e++) {
      const et = t + e * (dur / 8)
      const buf = this.noiseBuffer(0.04)
      const src = ctx.createBufferSource()
      src.buffer = buf
      const hp = ctx.createBiquadFilter()
      hp.type = "highpass"
      hp.frequency.value = 7000
      const g = ctx.createGain()
      g.gain.setValueAtTime(e % 2 === 0 ? 0.025 : 0.04, et)
      g.gain.exponentialRampToValueAtTime(0.0001, et + 0.04)
      src.connect(hp)
      hp.connect(g)
      g.connect(this.musicGain!)
      src.start(et)
    }
  }

  private noiseCache: { len: number; buf: AudioBuffer } | null = null
  private noiseBuffer(seconds: number) {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * seconds)
    if (this.noiseCache && this.noiseCache.len === len) return this.noiseCache.buf
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    this.noiseCache = { len, buf }
    return buf
  }

  /* ---------------- SFX ---------------- */

  setSfx(on: boolean) {
    this.sfxOn = on
  }

  get sfxEnabled() {
    return this.sfxOn
  }

  setSfxPack(pack: SfxPack) {
    this.sfxPack = pack
  }

  private tone(
    freq: number,
    t: number,
    opts: { type?: OscillatorType; vol?: number; dur?: number; glideTo?: number } = {}
  ) {
    const ctx = this.ctx!
    const { type = "triangle", vol = 0.1, dur = 0.4, glideTo } = opts
    const o = ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(freq, t)
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur * 0.6)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0, t)
    g.gain.linearRampToValueAtTime(vol, t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g)
    g.connect(this.master!)
    o.start(t)
    o.stop(t + dur + 0.05)
  }

  /** Merge jingle: bright arpeggio that rises with the merge level. */
  mergeSfx(level: number) {
    if (!this.sfxOn) return
    const ctx = this.ensureCtx()
    if (!ctx) return
    const t0 = ctx.currentTime
    const base = MELODY_SCALE[Math.min(level, MELODY_SCALE.length - 1)] + 12
    const intervals =
      this.sfxPack === "retro" ? [0, 7, 12] : this.sfxPack === "chime" ? [0, 5, 12] : [0, 4, 7]
    const step = this.sfxPack === "retro" ? 0.045 : 0.055
    intervals.forEach((iv, i) => {
      const f = midiToFreq(base + iv)
      const t = t0 + i * step
      if (this.sfxPack === "pop") {
        this.tone(f, t, { type: "triangle", vol: 0.12, dur: 0.45 })
      } else if (this.sfxPack === "chime") {
        this.tone(f, t, { type: "sine", vol: 0.11, dur: 1.1 })
        // bell partial
        this.tone(f * 2.01, t, { type: "sine", vol: 0.03, dur: 0.5 })
      } else {
        this.tone(f, t, { type: "square", vol: 0.06, dur: 0.16 })
      }
    })
  }

  /** Tiny sound for a new tile spawn. */
  spawnSfx() {
    if (!this.sfxOn) return
    const ctx = this.ensureCtx()
    if (!ctx) return
    const t = ctx.currentTime
    if (this.sfxPack === "pop") {
      this.tone(500, t, { type: "sine", vol: 0.05, dur: 0.12, glideTo: 880 })
    } else if (this.sfxPack === "chime") {
      this.tone(1180, t, { type: "sine", vol: 0.05, dur: 0.6 })
    } else {
      this.tone(660, t, { type: "square", vol: 0.04, dur: 0.07 })
      this.tone(990, t + 0.07, { type: "square", vol: 0.04, dur: 0.07 })
    }
  }

  /** Big celebratory fanfare for the final reveal. */
  winSfx() {
    if (!this.sfxOn) return
    const ctx = this.ensureCtx()
    if (!ctx) return
    const t0 = ctx.currentTime
    const fanfare = [60, 64, 67, 72, 76, 79, 84]
    fanfare.forEach((n, i) => {
      const t = t0 + i * 0.12
      const f = midiToFreq(n)
      if (this.sfxPack === "pop") {
        this.tone(f, t, { type: "triangle", vol: 0.14, dur: 0.6 })
      } else if (this.sfxPack === "chime") {
        this.tone(f, t, { type: "sine", vol: 0.13, dur: 1.4 })
        this.tone(f * 2.01, t, { type: "sine", vol: 0.04, dur: 0.7 })
      } else {
        this.tone(f, t, { type: "square", vol: 0.07, dur: 0.2 })
      }
    })
  }
}
