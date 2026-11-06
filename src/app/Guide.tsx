import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { GUIDE_STEPS } from './guideSteps'
import { guidePosition, type Rect } from './guideLayout'

const PAD = 6
const CARD_W = 380

export function GuideOverlay({ index, onIndex, onClose }: { index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const step = GUIDE_STEPS[index]
  const [rect, setRect] = useState<Rect | null>(null)
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const [cardHeight, setCardHeight] = useState(300)
  const cardRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const update = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useLayoutEffect(() => {
    const card = cardRef.current
    if (!card) return
    const observer = new ResizeObserver(() => setCardHeight(card.getBoundingClientRect().height))
    observer.observe(card)
    return () => observer.disconnect()
  }, [])

  useLayoutEffect(() => {
    const el = step.target ? document.querySelector<HTMLElement>(`[data-guide="${step.target}"]`) : null
    el?.scrollIntoView({ block: 'start', inline: 'nearest' })
    let frame = 0
    const measure = () => {
      const r = el?.getBoundingClientRect()
      setRect((prev) => {
        if (!r) return null
        if (prev && prev.top === r.top && prev.left === r.left && prev.width === r.width && prev.height === r.height) return prev
        return { top: r.top, left: r.left, width: r.width, height: r.height }
      })
      frame = requestAnimationFrame(measure)
    }
    measure()
    return () => cancelAnimationFrame(frame)
  }, [step])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight' && index < GUIDE_STEPS.length - 1) onIndex(index + 1)
      else if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, onIndex, onClose])

  const width = Math.min(CARD_W, viewport.width - 16)
  const cardStyle = { width, ...guidePosition(rect, viewport, { width, height: cardHeight }) }

  const last = index === GUIDE_STEPS.length - 1
  return (
    <div className="fixed inset-0 z-50" aria-live="polite">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded border-2 border-yellow-400 transition-all duration-200"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + 2 * PAD,
            height: rect.height + 2 * PAD,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/45" />
      )}
      <div ref={cardRef} role="dialog" aria-modal="true" aria-label={`Guide: ${step.title}`} className="fixed guide-card p-3" style={cardStyle}>
        <div className="mb-1 flex items-baseline gap-2">
          <h2 className="flex-1 font-bold">{step.title}</h2>
          <span className="shrink-0 text-xs text-muted">
            {index + 1} / {GUIDE_STEPS.length}
          </span>
        </div>
        <div className="flex flex-col gap-2 text-[13px]">{step.body}</div>
        <div className="mt-3 flex flex-wrap gap-1">
          <button type="button" className="btn" onClick={onClose}>
            Beenden
          </button>
          <span className="flex-1" />
          <button type="button" className="btn" onClick={() => onIndex(index - 1)} disabled={index === 0}>
            Zurück
          </button>
          <button type="button" className="btn font-bold" onClick={() => (last ? onClose() : onIndex(index + 1))} autoFocus>
            {last ? 'Fertig' : 'Weiter'}
          </button>
        </div>
      </div>
    </div>
  )
}
