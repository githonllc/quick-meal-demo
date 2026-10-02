import { useState } from 'react'
import type { PhotoKind } from '../../shared/types'

// Two warm colors and the kind's name. They show while a photo loads, or if it fails.
const COLORS: Record<PhotoKind, [string, string]> = {
  bowl: ['#d9822b', '#f2b45e'],
  noodles: ['#c8561f', '#eba04a'],
  dumplings: ['#c98f4a', '#ecc98a'],
  soup: ['#b8461f', '#e8864f'],
  taco: ['#d1861a', '#f0c24f'],
  burrito: ['#a8632a', '#dba35d'],
  burger: ['#9c4a1e', '#d98a3d'],
  fries: ['#e0a21d', '#f7d56a'],
  pizza: ['#c5341f', '#ee8a3c'],
  salad: ['#4f8a2f', '#a6c957'],
  sushi: ['#d6483a', '#f4a58a'],
  curry: ['#b9731a', '#e8a93b'],
  sandwich: ['#b5702f', '#e5b873'],
  chicken: ['#c06a1c', '#eba54a'],
  poke: ['#d4574a', '#f2a07a'],
  rice: ['#c9a063', '#efd9a8'],
}

export function FoodTile({ kind, size }: { kind: PhotoKind; size: 'card' | 'thumb' | 'hero' }) {
  const [a, b] = COLORS[kind]
  const [failed, setFailed] = useState(false)
  return (
    <div
      className={`tile tile-${size}`}
      role="img"
      aria-label={kind}
      style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
    >
      {/* The photo covers the name once it paints. A photo the browser already has paints in the
          first frame, so a remounted tile never shows the name over it while it waits for onLoad. */}
      <span aria-hidden="true">{kind}</span>
      {!failed && <img src={`/img/${kind}.webp`} alt="" loading="lazy" onError={() => setFailed(true)} />}
    </div>
  )
}
