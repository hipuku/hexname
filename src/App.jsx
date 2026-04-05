import { useState, useEffect, useCallback, useRef } from 'react'
import { nameColor, parseColor } from './colorMatcher'
import './index.css'

// ─── Toast ────────────────────────────────────────────────────────────────────

let toastId = 0

function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((msg) => {
    const id = ++toastId
    setToasts(prev => [...prev, { id, msg }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2200)
  }, [])

  return { toasts, addToast }
}

function ToastStack({ toasts }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className="toast">{t.msg}</div>
      ))}
    </div>
  )
}

// ─── URL helpers ──────────────────────────────────────────────────────────────

function parseUrlColors() {
  const hash = window.location.hash.replace('#', '')
  if (!hash) return []
  return hash.split(',').map(h => h.trim()).filter(Boolean)
}

function setUrlColors(hexes) {
  const clean = hexes.map(h => h.replace('#', ''))
  window.history.replaceState(null, '', clean.length ? `#${clean.join(',')}` : window.location.pathname)
}

// ─── Hex validation ───────────────────────────────────────────────────────────

const HEX_RE = /^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/

function isValidHex(str) { return HEX_RE.test(str.trim()) }

function normaliseHex(str) {
  const m = str.trim().match(/^#?([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/)
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  return `#${h.toUpperCase()}`
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconCopy() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="5" width="9" height="9" />
      <path d="M11 5V3a1 1 0 0 0-1-1H3a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h2" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 8 6.5 11.5 13 4.5" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="1" y1="1" x2="10" y2="10" />
      <line x1="10" y1="1" x2="1" y2="10" />
    </svg>
  )
}

function IconHalfMoon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
      <path d="M6 1a5 5 0 0 0 0 10V1z" />
      <circle cx="6" cy="6" r="5" fill="none" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  )
}

// ─── Btn ──────────────────────────────────────────────────────────────────────

function Btn({ children, onClick, variant = 'primary', icon }) {
  const styles = {
    primary:   { background: 'var(--navy)', color: '#fff' },
    secondary: { background: 'var(--blue)', color: '#fff' },
    ghost:     { background: 'var(--ink-4)', color: 'var(--ink-2)' },
  }
  return (
    <button
      onClick={onClick}
      className="btn state-layer inline-flex items-center gap-1.5 px-3 py-1.5 btn-label"
      style={styles[variant]}
    >
      {icon && icon}
      {children}
    </button>
  )
}

// ─── Copy icon button ─────────────────────────────────────────────────────────

function CopyIconBtn({ text, onDark = false, onToast }) {
  const [copied, setCopied] = useState(false)
  const [popping, setPopping] = useState(false)

  const handle = (e) => {
    e.stopPropagation()
    navigator.clipboard.writeText(text).catch(() => {})
    setCopied(true)
    setPopping(true)
    onToast?.(`Copied: ${text.length > 20 ? text.slice(0, 20) + '…' : text}`)
    setTimeout(() => setPopping(false), 200)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <button
      onClick={handle}
      title={`Copy ${text}`}
      className={`icon-btn flex items-center justify-center w-6 h-6 ${popping ? 'copy-pop' : ''}`}
      style={{ color: onDark ? 'var(--ink-on-dark-2)' : 'var(--ink-3)', opacity: 0.7 }}
    >
      {copied ? <IconCheck /> : <IconCopy />}
    </button>
  )
}

// ─── Mosaic grid helper ───────────────────────────────────────────────────────
// Odd counts: first card spans full width for a natural mosaic feel

function getGridStyle(index, total) {
  if (total === 1) return { gridColumn: 'span 2' }
  if (total % 2 === 1 && index === 0) return { gridColumn: 'span 2' }
  return {}
}

// ─── Color card ───────────────────────────────────────────────────────────────

function ColorCard({ result, onRemove, index, total, onToast }) {
  const onDark = !result.isLight

  return (
    <div
      className={`card-enter color-card flex flex-col ${onDark ? 'on-dark' : ''}`}
      style={{
        backgroundColor: result.hex,
        animationDelay: `${index * 35}ms`,
        ...getGridStyle(index, total),
      }}
    >
      {/* Top row */}
      <div className="flex justify-between items-center px-4 pt-4">
        <div className="flex items-center gap-1.5 t-label">
          <IconHalfMoon />
          <span>{result.contrastRatio}:1</span>
        </div>
        <button
          onClick={onRemove}
          className="icon-btn flex items-center justify-center w-6 h-6 t-label"
          title="Remove"
          style={{ opacity: 0.55 }}
        >
          <IconClose />
        </button>
      </div>

      {/* Color name */}
      <div className="flex items-start justify-between px-4 pt-5 pb-1 gap-3">
        <p className="t-title flex-1">{result.name}</p>
        <CopyIconBtn text={result.name} onDark={onDark} onToast={onToast} />
      </div>

      {/* Hex */}
      <div className="flex items-center justify-between px-4 pb-5 gap-3">
        <p className="t-code">{result.hex.toUpperCase()}</p>
        <CopyIconBtn text={result.hex.toUpperCase()} onDark={onDark} onToast={onToast} />
      </div>
    </div>
  )
}

// ─── Export panel ─────────────────────────────────────────────────────────────

function ExportPanel({ results, onToast }) {
  const [format, setFormat] = useState('css')

  const slug = n => n.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
  const key  = n => n.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')

  const outputs = {
    css:      results.map(r => `--color-${slug(r.name)}: ${r.hex.toUpperCase()};`).join('\n'),
    json:     JSON.stringify(Object.fromEntries(results.map(r => [key(r.name), r.hex.toUpperCase()])), null, 2),
    tailwind: `colors: {\n${results.map(r => `  '${slug(r.name)}': '${r.hex.toUpperCase()}'`).join(',\n')}\n}`,
    list:     results.map(r => `${r.name.padEnd(24)}${r.hex.toUpperCase()}`).join('\n'),
  }

  const tabs = ['css', 'json', 'tailwind', 'list']

  return (
    <div
      className="mt-4 card-enter"
      style={{ border: '1px solid var(--ink-4)', background: 'var(--surface-card)' }}
    >
      <div
        className="flex items-center gap-3 px-4"
        style={{ borderBottom: '1px solid var(--ink-4)' }}
      >
        <div className="flex">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setFormat(t)}
              className="state-layer px-3 py-2.5 btn-label transition-colors"
              style={{
                color: format === t ? 'var(--ink-1)' : 'var(--ink-3)',
                borderBottom: format === t ? '1px solid var(--ink-1)' : '1px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <CopyIconBtn text={outputs[format]} onToast={onToast} />
        </div>
      </div>
      <pre className="p-5 t-code overflow-x-auto leading-relaxed whitespace-pre">
        {outputs[format]}
      </pre>
    </div>
  )
}

// ─── Input ────────────────────────────────────────────────────────────────────

function HexInput({ value, onChange, onAdd, onPasteMultiple }) {
  // Split on commas/newlines so both typed and pasted multi-value works the same
  const parts    = value.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
  const isMulti  = parts.length > 1
  const valid    = !isMulti && isValidHex(value)
  const allValid = isMulti && parts.every(isValidHex)

  // Only flag a part as invalid once it's long enough to make a judgement (3+ chars)
  const hasError = isMulti
    ? parts.some(p => p.length >= 3 && !isValidHex(p))
    : value.trim().length >= 3 && !valid

  const hasText  = value.trim().length > 0
  const preview  = valid ? parseColor(value) : null
  const liveName = preview ? nameColor(value.trim())?.name : null

  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return
    if (isMulti && allValid) onPasteMultiple(parts)
    else if (valid) onAdd(value.trim())
  }

  return (
    <div className="input-wrap" style={hasText && hasError ? { borderColor: '#cc3333' } : {}}>
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="w-7 h-7 flex-shrink-0 transition-all duration-150"
          style={{
            backgroundColor: preview ? preview.hex() : 'transparent',
            border: preview ? 'none' : '1.5px dashed var(--ink-4)',
            boxShadow: preview ? '0 1px 6px rgba(0,0,0,0.12)' : 'none',
          }}
        />
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="#hex or FFF, #A1B2C3"
          className="flex-1 bg-transparent outline-none t-code"
          style={{ color: 'var(--ink-1)', caretColor: 'var(--blue)' }}
          autoFocus
          spellCheck={false}
        />
        {valid    && <Btn onClick={() => onAdd(value.trim())} variant="primary">ADD</Btn>}
        {allValid && <Btn onClick={() => onPasteMultiple(parts)} variant="primary">ADD {parts.length}</Btn>}
      </div>

      {liveName && (
        <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderTop: '1px solid var(--ink-4)' }}>
          <div className="w-4 h-4 flex-shrink-0" style={{ backgroundColor: preview.hex() }} />
          <span className="t-body" style={{ color: 'var(--ink-1)' }}>{liveName}</span>
          <span className="t-code-sm">{preview.hex().toUpperCase()}</span>
        </div>
      )}

      {hasText && hasError && (
        <p className="px-4 pb-2.5 t-code-sm" style={{ color: '#cc3333' }}>
          must be 3 or 6 hex characters, e.g. FFF or A1B2C3
        </p>
      )}
    </div>
  )
}

// ─── Palette swatch strip ─────────────────────────────────────────────────────

// Compact vertical strip — same height as swatches, narrow, no labels
function PaletteStrip({ samples, onAddAll }) {
  return (
    <button
      onClick={onAddAll}
      className="palette-strip swatch-strip flex-shrink-0 overflow-hidden flex flex-row"
      title="Add full palette"
      style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.10)' }}
    >
      {samples.map((hex) => (
        <div
          key={hex}
          className="flex-1 h-full"
          style={{ backgroundColor: hex }}
        />
      ))}
    </button>
  )
}

// ─── App ──────────────────────────────────────────────────────────────────────

const SAMPLES = ['#F6F7ED', '#DBE64C', '#001F3F', '#74C365', '#00804C', '#1E488F']
export default function App() {
  const [inputs, setInputs]             = useState(() => parseUrlColors())
  const [currentInput, setCurrentInput] = useState('')
  const [results, setResults]           = useState([])
  const [showExport, setShowExport]     = useState(false)
  const { toasts, addToast }            = useToast()

  useEffect(() => {
    const named = inputs.map(i => nameColor(i)).filter(Boolean)
    setResults(named)
    setUrlColors(named.map(r => r.hex))
  }, [inputs])

  const addColor = (val) => {
    const hex = normaliseHex(val)
    if (!hex) return
    if (results.some(r => r.hex.toUpperCase() === hex)) { addToast(`${hex} already in palette`); setCurrentInput(''); return }
    setInputs(prev => [...prev, hex])
    setCurrentInput('')
    const name = nameColor(hex)?.name
    if (name) addToast(`Added ${name}`)
  }

  const addMultiple = (vals) => {
    const existing = new Set(results.map(r => r.hex.toUpperCase()))
    const deduped = vals.filter(isValidHex).map(normaliseHex).filter(h => h && !existing.has(h))
    setInputs(prev => [...prev, ...deduped])
    setCurrentInput('')
    if (deduped.length) addToast(`Added ${deduped.length} color${deduped.length > 1 ? 's' : ''}`)
  }

  const removeColor = (idx) => {
    const name = results[idx]?.name
    setInputs(prev => prev.filter((_, i) => i !== idx))
    if (name) addToast(`Removed ${name}`)
  }

  const clearAll = () => {
    setInputs([])
    setResults([])
    setShowExport(false)
    window.history.replaceState(null, '', window.location.pathname)
    addToast('Palette cleared')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--surface-page)' }}>
      <ToastStack toasts={toasts} />
      <div className="max-w-2xl mx-auto px-6 py-16 flex-1 w-full">

        {/* Header */}
        <div className="mb-10">
          <h1 className="t-display mb-1">
            <span style={{ color: 'var(--blue)' }}>hex</span>
            <span style={{ color: 'var(--navy)' }}>name</span>
          </h1>
          <p className="t-body" style={{ color: 'var(--ink-2)' }}>
            Every hex code has a name.
          </p>
        </div>

        {/* Input */}
        <HexInput
          value={currentInput}
          onChange={setCurrentInput}
          onAdd={addColor}
          onPasteMultiple={addMultiple}
        />
        <p className="t-code-sm mt-2">
          press enter · paste comma-separated codes for a palette
        </p>

        {/* Results */}
        {results.length > 0 ? (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-4">
              <span className="t-label">{results.length} {results.length === 1 ? 'color' : 'colors'}</span>
              <div className="flex gap-2">
                <Btn onClick={() => { navigator.clipboard.writeText(window.location.href); addToast('Link copied') }} variant="ghost">SHARE</Btn>
                <Btn onClick={() => setShowExport(e => !e)} variant="primary">
                  {showExport ? 'HIDE EXPORT' : 'EXPORT'}
                </Btn>
                <Btn onClick={clearAll} variant="ghost">CLEAR</Btn>
              </div>
            </div>

            {/* Mosaic grid — no gap */}
            <div className="grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {results.map((result, i) => (
                <ColorCard
                  key={`${result.hex}-${i}`}
                  result={result}
                  index={i}
                  total={results.length}
                  onRemove={() => removeColor(i)}
                  onToast={addToast}
                />
              ))}
            </div>

            {showExport && <ExportPanel results={results} onToast={addToast} />}
          </div>
        ) : (
          <div className="mt-14">
            <p className="t-label mb-4">try these</p>
            <div className="flex items-center gap-3">
              {/* Individual swatches */}
              {SAMPLES.map((hex) => (
                <button
                  key={hex}
                  onClick={() => addColor(hex)}
                  className="palette-strip swatch-tile flex-shrink-0"
                  style={{
                    backgroundColor: hex,
                    border: hex === '#F6F7ED' ? '1px solid var(--ink-4)' : 'none',
                    boxShadow: '0 1px 6px rgba(0,0,0,0.10)',
                  }}
                  title={hex}
                />
              ))}
              {/* Divider */}
              <div className="swatch-divider" style={{ background: 'var(--ink-4)', flexShrink: 0, margin: '0 4px' }} />
              {/* Compact palette strip */}
              <PaletteStrip samples={SAMPLES} onAddAll={() => addMultiple(SAMPLES)} />
            </div>
          </div>
        )}
      </div>

      <Colophon />
    </div>
  )
}

// ─── Colophon ─────────────────────────────────────────────────────────────────

const PALETTE = [
  { hex: '#F6F7ED', name: 'Praxeti White' },
  { hex: '#DBE64C', name: 'First Colors of Spring' },
  { hex: '#001F3F', name: 'Midnight Mirage' },
  { hex: '#74C365', name: 'Mantis' },
  { hex: '#00804C', name: 'Picture Book Green' },
  { hex: '#1E488F', name: 'Nuit Blanche' },
]

function Colophon() {
  const footnote = { fontFamily: 'var(--font-sans)', fontSize: 11, lineHeight: 1.6, color: 'var(--ink-2)' }
  const dim      = { ...footnote, color: 'var(--ink-3)' }
  const ref      = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const set = (h) => document.documentElement.style.setProperty('--footer-h', `${h}px`)
    set(el.getBoundingClientRect().height)
    const observer = new ResizeObserver(([entry]) => set(entry.contentRect.height))
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <footer ref={ref} style={{ borderTop: '1px solid var(--ink-4)' }}>
      <div className="max-w-2xl mx-auto px-6 py-10 grid gap-8" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>

        {/* How it works */}
        <div className="flex flex-col gap-2">
          <p className="t-label mb-1">How it works</p>
          <p style={footnote}>
            Each color is matched against 30,000+ named colors using Delta-E distance in the CIE Lab color space, the same model the human eye uses to judge similarity.
          </p>
          <p style={footnote}>
            Lab is perceptually uniform, so a distance of 5 always looks the same regardless of hue.
          </p>
        </div>

        {/* Palette */}
        <div className="flex flex-col gap-2">
          <p className="t-label mb-1">Palette</p>
          <div className="flex flex-col gap-1.5">
            {PALETTE.map(({ hex, name }) => (
              <div key={hex} className="flex items-center gap-2">
                <div
                  className="flex-shrink-0"
                  style={{
                    width: 12,
                    height: 12,
                    backgroundColor: hex,
                    border: hex === '#F6F7ED' ? '1px solid var(--ink-4)' : 'none',
                  }}
                />
                <span style={footnote}>{name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Built with */}
        <div className="flex flex-col gap-2">
          <p className="t-label mb-1">Built with</p>
          <div className="flex flex-col gap-1.5">
            {[
              ['Typefaces', 'Andika, Geist Mono'],
              ['Framework', 'React 19 + Vite'],
              ['Styles', 'Tailwind CSS v4'],
              ['Color math', 'chroma-js'],
              ['Dataset', 'meodai/color-names'],
            ].map(([label, value]) => (
              <p key={label} style={footnote}>
                <span style={dim}>{label} </span>{value}
              </p>
            ))}
          </div>
          <p style={{ ...dim, marginTop: 12 }}>
            hexname {new Date().getFullYear()}
          </p>
        </div>

      </div>
    </footer>
  )
}
