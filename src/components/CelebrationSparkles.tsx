"use client"

import { useEffect, useState } from "react"

interface Sparkle {
  id: number
  x: number
  y: number
  size: number
  delay: number
  duration: number
  type: "heart" | "sparkle"
}

interface CelebrationSparklesProps {
  color: string // Color to match the collage palette
  active: boolean
}

export function CelebrationSparkles({ color, active }: CelebrationSparklesProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([])

  useEffect(() => {
    if (!active) {
      setSparkles([])
      return
    }

    // Generate initial sparkles
    const newSparkles: Sparkle[] = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 12 + Math.random() * 20,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 3,
      type: Math.random() > 0.5 ? "heart" : "sparkle",
    }))
    setSparkles(newSparkles)

    // Continuously add new sparkles
    const interval = setInterval(() => {
      setSparkles((prev) => {
        const updated = prev.map((s) => ({
          ...s,
          id: s.id + 100,
          x: Math.random() * 100,
          y: Math.random() * 100,
          delay: 0,
        }))
        return updated
      })
    }, 3000)

    return () => clearInterval(interval)
  }, [active])

  if (!active) return null

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {sparkles.map((sparkle) => (
        <div
          key={sparkle.id}
          className="absolute animate-sparkle-float"
          style={{
            left: `${sparkle.x}%`,
            top: `${sparkle.y}%`,
            fontSize: `${sparkle.size}px`,
            animationDelay: `${sparkle.delay}s`,
            animationDuration: `${sparkle.duration}s`,
            color: color,
            filter: `drop-shadow(0 0 8px ${color})`,
          }}
        >
          {sparkle.type === "heart" ? "❤️" : "✨"}
        </div>
      ))}
    </div>
  )
}
