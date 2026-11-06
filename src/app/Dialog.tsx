import { useEffect, type ReactNode } from 'react'

export function Dialog({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="dialog-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-label={title}
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`flex min-w-0 max-h-full flex-col dialog-frame ${wide ? 'h-[90dvh] w-[min(1000px,100%)]' : 'w-[min(420px,100%)]'}`}
      >
        <div className="titlebar flex shrink-0 items-center px-2 py-1 font-bold">
          <span className="min-w-0 flex-1">{title}</span>
          <button type="button" aria-label="Schließen" className="btn px-2! py-0!" onClick={onClose}>
            ×
          </button>
        </div>
        <div className="dialog-content flex min-h-0 flex-1 flex-col p-3">{children}</div>
      </div>
    </div>
  )
}
