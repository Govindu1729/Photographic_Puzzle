"use client"

import { useEffect, useRef } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  gravity: number
  shape: "circle" | "rect" | "heart"
  spin: number
  angle: number
}

/** Full-screen decorative FX layer.
 *  Listens for window events:
 *   - "fx:burst"  { x, y, color, count? }  merge particle burst + glow ring
 *   - "fx:confetti" { duration? }           celebration confetti rain
 */
export default function ParticleLayer() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let particles: Particle[] = []
    let raf = 0
    let confettiUntil = 0

    const resize = () => {
      canvas.width = window.innerWidth * devicePixelRatio
      canvas.height = window.innerHeight * devicePixelRatio
      canvas.style.width = `${window.innerWidth}px`
      canvas.style.height = `${window.innerHeight}px`
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    }
    resize()
    window.addEventListener("resize", resize)

    const rand = (a: number, b: number) => a + Math.random() * (b - a)

    const onBurst = (e: Event) => {
      const { x, y, color, count } = (e as CustomEvent).detail as {
        x: number
        y: number
        color: string
        count?: number
      }
      const n = count ?? 26
      for (let i = 0; i < n; i++) {
        const angle = (Math.PI * 2 * i) / n + rand(-0.2, 0.2)
        const speed = rand(60, 240)
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 0,
          maxLife: rand(0.5, 0.9),
          size: rand(3, 8),
          color,
          gravity: 260,
          shape: Math.random() < 0.3 ? "heart" : Math.random() < 0.5 ? "rect" : "circle",
          spin: rand(-8, 8),
          angle: rand(0, Math.PI),
        })
      }
      // bright core flash
      for (let i = 0; i < 8; i++) {
        particles.push({
          x,
          y,
          vx: rand(-30, 30),
          vy: rand(-30, 30),
          life: 0,
          maxLife: 0.35,
          size: rand(10, 18),
          color: "#ffffff",
          gravity: 0,
          shape: "circle",
          spin: 0,
          angle: 0,
        })
      }
    }

    const onConfetti = (e: Event) => {
      const { duration } = (e as CustomEvent).detail as { duration?: number }
      confettiUntil = performance.now() + (duration ?? 4000)
    }

    const palette = ["#ff5e8a", "#ffd166", "#7bdff2", "#b892ff", "#8ce99a", "#ffa94d"]
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now

      // spawn confetti while active
      if (now < confettiUntil) {
        for (let i = 0; i < 5; i++) {
          particles.push({
            x: rand(0, window.innerWidth),
            y: -12,
            vx: rand(-40, 40),
            vy: rand(80, 180),
            life: 0,
            maxLife: rand(2.5, 4),
            size: rand(5, 10),
            color: palette[Math.floor(Math.random() * palette.length)],
            gravity: 60,
            shape: "rect",
            spin: rand(-10, 10),
            angle: rand(0, Math.PI),
          })
        }
      }

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
      particles = particles.filter((p) => p.life < p.maxLife && p.y < window.innerHeight + 20)
      for (const p of particles) {
        p.life += dt
        p.vy += p.gravity * dt
        p.vx *= 1 - 1.2 * dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.angle += p.spin * dt
        const alpha = Math.max(0, 1 - p.life / p.maxLife)
        ctx.globalAlpha = alpha
        ctx.fillStyle = p.color
        if (p.shape === "circle") {
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2)
          ctx.fill()
        } else if (p.shape === "rect") {
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.angle)
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6)
          ctx.restore()
        } else {
          // tiny heart
          ctx.save()
          ctx.translate(p.x, p.y)
          ctx.rotate(p.angle)
          ctx.font = `${p.size * 2}px serif`
          ctx.fillText("\u2665", -p.size, p.size * 0.6)
          ctx.restore()
        }
      }
      ctx.globalAlpha = 1
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)

    window.addEventListener("fx:burst", onBurst)
    window.addEventListener("fx:confetti", onConfetti)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener("resize", resize)
      window.removeEventListener("fx:burst", onBurst)
      window.removeEventListener("fx:confetti", onConfetti)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-50"
      aria-hidden="true"
    />
  )
}
