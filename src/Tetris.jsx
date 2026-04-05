import { useState, useEffect, useRef, useMemo } from 'react'

// ─── Constants ────────────────────────────────────────────────────────────────

const CELL          = 22    // px per cell
const CONTENT_HALF  = 336   // half of max-w-2xl (672px)
const FADE_MS       = 220   // cell fade-out duration before gravity applies
const TICK_L        = 300   // left board ms per drop
const TICK_R        = 340   // right board ms per drop (slight desync)

// ─── Tetrominoes ──────────────────────────────────────────────────────────────

const SHAPES = [
  [[1,1,1,1]],           // I
  [[1,1],[1,1]],         // O
  [[0,1,0],[1,1,1]],     // T
  [[0,1,1],[1,1,0]],     // S
  [[1,1,0],[0,1,1]],     // Z
  [[1,0],[1,0],[1,1]],   // L
  [[0,1],[0,1],[1,1]],   // J
]

function randShape() {
  return SHAPES[Math.floor(Math.random() * SHAPES.length)]
}

function rotateShape(s) {
  const rows = s.length, cols = s[0].length
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => s[rows - 1 - r][c])
  )
}

// ─── Board helpers ────────────────────────────────────────────────────────────

function emptyBoard(h, bw) {
  return Array.from({ length: h }, () => Array(bw).fill(null))
}

function fits(board, shape, x, y, h, bw) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue
      const nr = y + r, nc = x + c
      if (nr >= h || nc < 0 || nc >= bw) return false
      if (nr >= 0 && board[nr][nc]) return false
    }
  }
  return true
}

function lockPiece(board, shape, x, y, color) {
  const b = board.map(row => [...row])
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      if (shape[r][c] && y + r >= 0 && x + c < board[0].length) b[y + r][x + c] = color
  return b
}

function clearLines(board, h) {
  const bw   = board[0]?.length ?? 1
  const kept = board.filter(row => row.some(cell => !cell))
  const pad  = h - kept.length
  return [...Array.from({ length: pad }, () => Array(bw).fill(null)), ...kept]
}

function mergeDisplay(board, piece, h) {
  if (!piece) return board
  const d = board.map(r => [...r])
  for (let r = 0; r < piece.shape.length; r++)
    for (let c = 0; c < piece.shape[r].length; c++)
      if (piece.shape[r][c] && piece.y + r >= 0 && piece.y + r < h)
        d[piece.y + r][piece.x + c] = piece.color
  return d
}

// Pre-fill bottom rows so the boards look lived-in when Tetris mode activates.
// Colors cycle across columns so all palette colors appear in the pre-fill.
// Each row keeps one intentional gap (staggered per side) so clearLines won't
// sweep them away immediately.
function fillBottomRows(g, h, colors) {
  ;['left', 'right'].forEach(side => {
    const board = g[side].board
    const bw    = board[0]?.length ?? 1
    const gaps  = side === 'left'
      ? [Math.floor(bw * 0.2), Math.floor(bw * 0.8), Math.floor(bw * 0.4)]
      : [Math.floor(bw * 0.7), Math.floor(bw * 0.1), Math.floor(bw * 0.5)]
    for (let i = 0; i < 3; i++) {
      const r   = h - 3 + i
      const gap = gaps[i]
      if (r < 0 || r >= h) continue
      for (let c = 0; c < bw; c++) {
        if (!board[r][c] && c !== gap) board[r][c] = colors[c % colors.length]
      }
    }
  })
}

// After cells are removed, remaining blocks fall to fill the gaps (column-wise).
function applyGravity(board) {
  const h   = board.length
  const bw  = board[0]?.length ?? 1
  const out = Array.from({ length: h }, () => Array(bw).fill(null))
  for (let c = 0; c < bw; c++) {
    const cells = []
    for (let r = 0; r < h; r++) if (board[r][c]) cells.push(board[r][c])
    const offset = h - cells.length
    cells.forEach((cell, i) => { out[offset + i][c] = cell })
  }
  return out
}

// ─── TetrisBoard ──────────────────────────────────────────────────────────────

function TetrisBoard({ board, side, fadingSet, lightSet }) {
  const isLeft = side === 'left'
  return (
    <div
      className="tetris-col"
      aria-hidden="true"
      style={{
        position: 'fixed',
        top: 0,
        height: '100vh',
        ...(isLeft
          ? { left: 0, right: `calc(50% + ${CONTENT_HALF}px)` }
          : { right: 0, left: `calc(50% + ${CONTENT_HALF}px)` }),
        overflow: 'hidden',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        {board.map((row, r) =>
          row.map((color, c) => {
            if (!color) return null
            const key    = `${r}-${c}`
            const fading = fadingSet.has(key)
            const light  = lightSet.has(color.toUpperCase())
            return (
              <div
                key={key}
                style={{
                  position: 'absolute',
                  top:    r * CELL + 1,
                  left:   c * CELL + 1,
                  width:  CELL - 2,
                  height: CELL - 2,
                  backgroundColor: color,
                  boxShadow: light ? 'inset 0 0 0 1px rgba(0,0,0,0.18)' : 'none',
                  opacity:    fading ? 0 : 1,
                  transition: fading ? `opacity ${FADE_MS}ms ease` : 'none',
                }}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

// ─── TetrisGame ───────────────────────────────────────────────────────────────

export function TetrisGame({ colors, lightColors, active }) {
  // bw: 4 is a safe default before activation computes the real gutter width
  const gRef          = useRef({ left: { board: [], piece: null }, right: { board: [], piece: null }, colorIdx: 0, h: 30, bw: 4 })
  const [boards, setBoards]         = useState({ left: [], right: [] })
  const [fadingSets, setFadingSets] = useState({ left: new Set(), right: new Set() })
  const colorsRef     = useRef(colors)
  const prevColorsRef = useRef(colors)
  const lightSetRef   = useRef(new Set())
  const fadeTimerRef  = useRef(null)

  const lightSet = useMemo(
    () => new Set(lightColors.map(c => c.toUpperCase())),
    [lightColors]
  )

  useEffect(() => { lightSetRef.current = lightSet }, [lightSet])

  // ── Start / stop ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!active) {
      if (fadeTimerRef.current) { clearTimeout(fadeTimerRef.current); fadeTimerRef.current = null }
      gRef.current = { left: { board: [], piece: null }, right: { board: [], piece: null }, colorIdx: 0, h: 30, bw: 4 }
      setBoards({ left: [], right: [] })
      setFadingSets({ left: new Set(), right: new Set() })
      return
    }

    function computeDimensions() {
      return {
        h:  Math.max(10, Math.floor(window.innerHeight / CELL)),
        bw: Math.max(4,  Math.floor((window.innerWidth / 2 - CONTENT_HALF) / CELL)),
      }
    }

    function initBoards({ h, bw }) {
      gRef.current.h  = h
      gRef.current.bw = bw
      gRef.current.left.board  = emptyBoard(h, bw)
      gRef.current.right.board = emptyBoard(h, bw)
      if (colorsRef.current.length) fillBottomRows(gRef.current, h, colorsRef.current)
    }

    function spawn() {
      const cols = colorsRef.current
      if (!cols.length) return null
      const color = cols[gRef.current.colorIdx % cols.length]
      gRef.current.colorIdx++
      let shape = randShape()
      const rots = Math.floor(Math.random() * 4)
      for (let i = 0; i < rots; i++) shape = rotateShape(shape)
      const x = Math.max(0, Math.floor(Math.random() * (gRef.current.bw - shape[0].length + 1)))
      return { shape, x, y: -shape.length, color }
    }

    function tick(side) {
      const s  = gRef.current[side]
      const bh = gRef.current.h
      const bw = gRef.current.bw
      if (!s.piece) { s.piece = spawn(); return null }

      const { shape, x, y, color } = s.piece
      if (fits(s.board, shape, x, y + 1, bh, bw)) {
        s.piece = { ...s.piece, y: y + 1 }
      } else {
        if (y < 0) {
          s.board = emptyBoard(bh, bw)
        } else {
          s.board = lockPiece(s.board, shape, x, y, color)
          s.board = clearLines(s.board, bh)
        }
        s.piece = spawn()
      }
      return mergeDisplay(s.board, s.piece, bh)
    }

    // Initial setup
    initBoards(computeDimensions())
    gRef.current.left.piece = spawn()
    setTimeout(() => { gRef.current.right.piece = spawn() }, 800)

    const { h } = gRef.current
    setBoards({
      left:  mergeDisplay(gRef.current.left.board,  gRef.current.left.piece,  h),
      right: mergeDisplay(gRef.current.right.board, gRef.current.right.piece, h),
    })

    // rAF loop — pauses on hidden tabs, no interval drift
    let lastL = 0, lastR = 0
    let rafId

    function loop(ts) {
      if (lastL === 0) lastL = ts
      if (lastR === 0) lastR = ts

      let leftBoard = null, rightBoard = null
      if (ts - lastL >= TICK_L) { lastL = ts; leftBoard  = tick('left')  }
      if (ts - lastR >= TICK_R) { lastR = ts; rightBoard = tick('right') }

      if (leftBoard || rightBoard) {
        setBoards(b => ({ left: leftBoard ?? b.left, right: rightBoard ?? b.right }))
      }
      rafId = requestAnimationFrame(loop)
    }

    rafId = requestAnimationFrame(loop)

    // Resize: recompute dimensions and reset boards
    function handleResize() {
      const dims = computeDimensions()
      if (dims.h === gRef.current.h && dims.bw === gRef.current.bw) return
      initBoards(dims)
      gRef.current.left.piece  = spawn()
      gRef.current.right.piece = spawn()
      const newH = gRef.current.h
      setBoards({
        left:  mergeDisplay(gRef.current.left.board,  gRef.current.left.piece,  newH),
        right: mergeDisplay(gRef.current.right.board, gRef.current.right.piece, newH),
      })
    }

    window.addEventListener('resize', handleResize)
    return () => { cancelAnimationFrame(rafId); window.removeEventListener('resize', handleResize) }
  }, [active])

  // ── React to palette changes ───────────────────────────────────────────────
  useEffect(() => {
    const prev = prevColorsRef.current
    const next = colors
    prevColorsRef.current = next
    colorsRef.current     = next

    if (!active) return

    const h          = gRef.current.h
    const bw         = gRef.current.bw
    const boardReady = gRef.current.left.board.length > 0

    // Palette fully cleared → wipe both boards
    if (next.length === 0) {
      if (boardReady) {
        ;['left', 'right'].forEach(side => {
          gRef.current[side].board = emptyBoard(h, bw)
          gRef.current[side].piece = null
        })
        setBoards({ left: emptyBoard(h, bw), right: emptyBoard(h, bw) })
      }
      return
    }

    if (!boardReady) return

    const prevSet = new Set(prev.map(c => c.toUpperCase()))
    const nextSet = new Set(next.map(c => c.toUpperCase()))
    const removed = new Set([...prevSet].filter(c => !nextSet.has(c)))
    const added   = [...nextSet].filter(c => !prevSet.has(c))

    // ── Color removed: fade cells out, then apply gravity ─────────────────
    if (removed.size) {
      const fadingL = new Set(), fadingR = new Set()
      ;[['left', fadingL], ['right', fadingR]].forEach(([side, fading]) => {
        const s = gRef.current[side]
        s.board.forEach((row, r) =>
          row.forEach((cell, c) => {
            if (cell && removed.has(cell.toUpperCase())) fading.add(`${r}-${c}`)
          })
        )
        // Kill any in-flight piece of the removed color
        if (s.piece && removed.has(s.piece.color?.toUpperCase())) s.piece = null
      })
      setFadingSets({ left: fadingL, right: fadingR })

      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current)
      fadeTimerRef.current = setTimeout(() => {
        fadeTimerRef.current = null
        ;['left', 'right'].forEach(side => {
          const s = gRef.current[side]
          s.board = s.board.map(row =>
            row.map(cell => (cell && removed.has(cell.toUpperCase()) ? null : cell))
          )
          s.board = applyGravity(s.board)
        })
        setFadingSets({ left: new Set(), right: new Set() })
        setBoards({
          left:  mergeDisplay(gRef.current.left.board,  gRef.current.left.piece,  h),
          right: mergeDisplay(gRef.current.right.board, gRef.current.right.piece, h),
        })
      }, FADE_MS + 30)
    }

    // ── Color added: jump colorIdx to it and respawn in-flight pieces ─────
    if (added.length) {
      const newHex = next.find(c => added.includes(c.toUpperCase()))
      if (newHex) {
        const idx = next.findIndex(c => c.toUpperCase() === newHex.toUpperCase())
        if (idx >= 0) {
          gRef.current.colorIdx = idx
          // Null out in-flight pieces so next tick spawns the new color immediately
          gRef.current.left.piece  = null
          gRef.current.right.piece = null
        }
      }
    }
  }, [colors, active])

  if (!active) return null
  return (
    <>
      <TetrisBoard board={boards.left}  side="left"  fadingSet={fadingSets.left}  lightSet={lightSet} />
      <TetrisBoard board={boards.right} side="right" fadingSet={fadingSets.right} lightSet={lightSet} />
    </>
  )
}
