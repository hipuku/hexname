import chroma from 'chroma-js'
import colornames from './colornames.json'

// Build a lookup array once at module load time
// Dataset is keyed as { "ff5733": "Name" }
const COLOR_LIST = Object.entries(colornames).map(([hex, name]) => {
  const h = hex.length === 6 ? hex : hex.padStart(6, '0')
  return { hex: `#${h}`, name }
})

/**
 * Parse any color input string to a chroma color, or null if invalid.
 */
export function parseColor(input) {
  if (!input || typeof input !== 'string') return null
  const trimmed = input.trim()
  if (!trimmed) return null

  // Try as-is (handles rgb(), hsl(), named CSS colors, #hex)
  try {
    return chroma(trimmed)
  } catch {}

  // Try adding # if it looks like a bare hex
  if (/^[0-9a-fA-F]{3,8}$/.test(trimmed)) {
    try {
      return chroma(`#${trimmed}`)
    } catch {}
  }

  return null
}

/**
 * Find the closest named color using Delta-E in Lab color space.
 * Returns { hex, name, distance } for the best match and top 4 nearest.
 */
export function findClosestColor(chromaColor) {
  const [L1, a1, b1] = chromaColor.lab()

  let best = null
  let bestDist = Infinity
  const top = []

  for (const entry of COLOR_LIST) {
    try {
      const [L2, a2, b2] = chroma(entry.hex).lab()
      const dist = Math.sqrt(
        (L1 - L2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2
      )
      if (dist < bestDist) {
        bestDist = dist
        best = { ...entry, distance: dist }
      }
      top.push({ ...entry, distance: dist })
    } catch {}
  }

  // Sort and return top 5 nearest (excluding exact best)
  top.sort((a, b) => a.distance - b.distance)
  const nearest = top.slice(1, 5)

  return { best, nearest }
}

/**
 * Full pipeline: parse input string → find name → return result object.
 */
export function nameColor(input) {
  const color = parseColor(input)
  if (!color) return null

  const hex = color.hex()
  const { best, nearest } = findClosestColor(color)

  const isLight = color.luminance() > 0.35
  // Contrast ratio against the text color that will appear on this card
  const contrastAgainst = isLight ? '#001F3F' : '#ffffff'
  const contrastRatio = Math.round(chroma.contrast(color, contrastAgainst) * 100) / 100

  return {
    hex,
    name: best?.name ?? 'Unknown',
    distance: best?.distance ?? null,
    rgb: color.rgb().map(Math.round),
    hsl: [
      Math.round(color.hsl()[0]) || 0,
      Math.round(color.hsl()[1] * 100),
      Math.round(color.hsl()[2] * 100),
    ],
    nearest,
    isLight,
    contrastRatio,
  }
}
