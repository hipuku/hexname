import chroma from 'chroma-js'
import colornames from './colornames.json'

// Build a lookup array once at module load time, including precomputed Lab values.
// Dataset is keyed as { "ff5733": "Name" }
const COLOR_LIST = Object.entries(colornames).map(([hex, name]) => {
  const h = hex.length === 6 ? hex : hex.padStart(6, '0')
  const [L, a, b] = chroma(`#${h}`).lab()
  return { hex: `#${h}`, name, L, a, b }
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
 * Returns { hex, name, distance } for the best match.
 */
function findClosestColor(chromaColor) {
  const [L1, a1, b1] = chromaColor.lab()

  let best = null
  let bestDist = Infinity

  for (const entry of COLOR_LIST) {
    const dist = Math.sqrt(
      (L1 - entry.L) ** 2 + (a1 - entry.a) ** 2 + (b1 - entry.b) ** 2
    )
    if (dist < bestDist) {
      bestDist = dist
      best = { hex: entry.hex, name: entry.name, distance: dist }
    }
  }

  return best
}

/**
 * Full pipeline: parse input string → find name → return result object.
 */
export function nameColor(input) {
  const color = parseColor(input)
  if (!color) return null

  const hex = color.hex()
  const best = findClosestColor(color)

  const isLight = color.luminance() > 0.35
  // Contrast ratio against the text color that will appear on this card
  const contrastAgainst = isLight ? '#001F3F' : '#ffffff'
  const contrastRatio = Math.round(chroma.contrast(color, contrastAgainst) * 100) / 100

  return {
    hex,
    name: best?.name ?? 'Unknown',
    rgb: color.rgb().map(Math.round),
    hsl: [
      Math.round(color.hsl()[0]) || 0,
      Math.round(color.hsl()[1] * 100),
      Math.round(color.hsl()[2] * 100),
    ],
    isLight,
    contrastRatio,
  }
}
