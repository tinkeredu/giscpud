import { useCallback, useEffect, useReducer, useState, type ReactNode } from 'react'
import { HINTS, initialMachine, MEMORY_OPS, reduce, type Action, type Machine, type Op } from '../core/machine'
import { Dialog } from './Dialog'
import { GuideOverlay } from './Guide'
import { GUIDE_STEPS } from './guideSteps'
import { MenuBar } from './Menu'
import { AcDisplay, GroupBox, InputBits, MemoryList, OutputLeds } from './Panels'

type Doc = { title: string; src: string }
const DOCS: Record<string, Doc> = {
  hilfe: { title: 'Hilfe', src: './docs/hilfe.htm' },
  befehle: { title: 'Befehle', src: './docs/befehlssatz.htm' },
}

type Skin = 'auto' | 'light' | 'dark' | 'classic' | 'terminal'
const SKINS: { id: Skin; label: string }[] = [
  { id: 'auto', label: 'Automatisch (System)' },
  { id: 'light', label: 'Hell' },
  { id: 'dark', label: 'Dunkel' },
  { id: 'classic', label: 'Klassisch (Windows)' },
  { id: 'terminal', label: 'Terminal' },
]
const SKIN_KEY = 'cpud.skin'
const STATE_KEY = 'cpud.state'
const darkQuery = window.matchMedia('(prefers-color-scheme: dark)')
const REPO_URL = 'https://github.com/tinkeredu/giscpud'

function useSkin() {
  const [skin, setSkin] = useState<Skin>(() => {
    const saved = localStorage.getItem(SKIN_KEY) as Skin | null
    return saved && SKINS.some((s) => s.id === saved) ? saved : 'auto'
  })
  const [systemDark, setSystemDark] = useState(darkQuery.matches)
  useEffect(() => {
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    darkQuery.addEventListener('change', onChange)
    return () => darkQuery.removeEventListener('change', onChange)
  }, [])
  useEffect(() => {
    localStorage.setItem(SKIN_KEY, skin)
    document.documentElement.dataset.skin = skin === 'auto' ? (systemDark ? 'dark' : 'light') : skin
  }, [skin, systemDark])
  return [skin, setSkin] as const
}

function useStoredFlag(key: string, initial: boolean) {
  const [value, setValue] = useState(() => {
    const saved = localStorage.getItem(key)
    return saved === null ? initial : saved === '1'
  })
  useEffect(() => {
    localStorage.setItem(key, value ? '1' : '0')
  }, [key, value])
  return [value, () => setValue((v) => !v)] as const
}

function loadMachine(): Machine {
  const m = initialMachine()
  try {
    const saved = JSON.parse(localStorage.getItem(STATE_KEY) ?? 'null')
    if (!saved) return m
    return {
      ...m,
      ac: saved.ac ?? 0,
      mem: Array.isArray(saved.mem) && saved.mem.length === m.mem.length ? saved.mem : m.mem,
      output: saved.output ?? 0,
      protocol: Array.isArray(saved.protocol) ? saved.protocol : [],
      recording: saved.recording ?? true,
      withComment: saved.withComment ?? true,
    }
  } catch {
    return m
  }
}

type Event = Action | { type: 'replace'; machine: Machine }
const machineReducer = (m: Machine, e: Event) => (e.type === 'replace' ? e.machine : reduce(m, e))

const guideState = (index: number) => GUIDE_STEPS.slice(0, index + 1).reduce((m, s) => s.apply?.(m) ?? m, initialMachine())

export default function App() {
  const [skin, setSkin] = useSkin()
  const [m, dispatch] = useReducer(machineReducer, undefined, loadMachine)
  const [acDecimal, toggleAcDecimal] = useStoredFlag('cpud.acDecimal', true)
  const [showIncDec, toggleIncDec] = useStoredFlag('cpud.incDec', true)
  const [showShift, toggleShift] = useStoredFlag('cpud.shift', false)
  const [showNeg, toggleNeg] = useStoredFlag('cpud.neg', false)
  const [showLogic, toggleLogic] = useStoredFlag('cpud.logic', false)
  const [showImage, toggleImage] = useStoredFlag('cpud.image', true)
  const [guideIndex, setGuideIndex] = useState<number | null>(null)
  const [beforeGuide, setBeforeGuide] = useState<Machine | null>(null)
  const [doc, setDoc] = useState<Doc | null>(null)
  const [about, setAbout] = useState(false)
  const guiding = guideIndex !== null

  useEffect(() => {
    if (guiding) return
    const { ac, mem, output, protocol, recording, withComment } = m
    localStorage.setItem(STATE_KEY, JSON.stringify({ ac, mem, output, protocol, recording, withComment }))
  }, [m, guiding])

  const modal = guiding || doc !== null || about || m.alert !== null
  useEffect(() => {
    if (modal) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && dispatch({ type: 'cancel' })
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [modal])

  const gotoGuideStep = useCallback((index: number) => {
    dispatch({ type: 'replace', machine: guideState(index) })
    setGuideIndex(index)
  }, [])

  const startGuide = () => {
    if (guiding) return
    setBeforeGuide(m)
    gotoGuideStep(0)
  }

  const closeGuide = useCallback(() => {
    setGuideIndex(null)
    if (beforeGuide) dispatch({ type: 'replace', machine: beforeGuide })
    setBeforeGuide(null)
  }, [beforeGuide])

  const pending = m.pending
  const selectingCell = pending?.stage === 'address' && !m.alert
  const enteringData = pending?.stage === 'data'

  const opButton = (op: Op, cls: string) => {
    const active = pending?.op === op
    return (
      <button
        key={op}
        type="button"
        className={`btn py-1! ${cls}`}
        title={HINTS[op]}
        aria-pressed={MEMORY_OPS.includes(op) ? active : undefined}
        disabled={pending !== null && !active}
        onClick={() => dispatch({ type: 'op', op })}
      >
        {op}
      </button>
    )
  }

  const saveProtocol = () => {
    const blob = new Blob([m.protocol.join('\r\n') + '\r\n'], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'protokoll.txt'
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="titlebar flex items-center gap-2 px-2 py-1">
        <img src="./favicon.ico" alt="" className="h-5 w-5" />
        <h1 className="flex-1 font-bold">Mikroprozessor direkt gesteuert</h1>
        <button type="button" className="btn py-0.5!" onClick={startGuide}>
          Guide starten
        </button>
      </header>
      <MenuBar
        menus={[
          {
            label: 'Ansicht',
            items: [
              { label: 'AC dezimal', checked: acDecimal, onSelect: toggleAcDecimal },
              { label: 'Increment / Decrement', checked: showIncDec, onSelect: toggleIncDec },
              { label: 'Schiebebefehle', checked: showShift, onSelect: toggleShift },
              { label: 'Negation', checked: showNeg, onSelect: toggleNeg },
              { label: 'Logikbefehle', checked: showLogic, onSelect: toggleLogic },
              { label: 'CPU-Bild', checked: showImage, onSelect: toggleImage },
              ...SKINS.map((s, i) => ({ label: s.label, checked: skin === s.id, separator: i === 0, onSelect: () => setSkin(s.id) })),
            ],
          },
          { label: 'Speicher', items: [{ label: 'löschen', onSelect: () => dispatch({ type: 'clearMemory' }) }] },
          {
            label: 'Hilfe',
            items: [
              { label: 'Guide starten', onSelect: startGuide },
              { label: 'Hilfe', onSelect: () => setDoc(DOCS.hilfe) },
              { label: 'Befehle', onSelect: () => setDoc(DOCS.befehle) },
              { label: 'Fehler melden', onSelect: () => window.open(`${REPO_URL}/issues/new`, '_blank', 'noopener') },
              { label: 'about', onSelect: () => setAbout(true) },
            ],
          },
        ]}
      />

      <main className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-3">
        <section
          className="cpu-panel group-box relative shrink-0 overflow-hidden p-4!"
          style={showImage ? { background: 'var(--panel) url(./cpu.jpg) center / cover no-repeat' } : undefined}
          aria-label="Prozessor"
        >
          <span className="chip-label absolute top-2 right-3">Prozessor</span>
          <div className="flex flex-wrap items-start gap-x-10 gap-y-4">
            <div className="flex w-64 flex-col gap-2" data-guide="ac">
              <span className="chip-label self-start text-xs">Akkumulator (AC)</span>
              <AcDisplay value={m.ac} decimal={acDecimal} />
              <div className="grid grid-cols-2 gap-2 px-4">
                {showIncDec && (
                  <>
                    {opButton('INC', '')}
                    {opButton('DEC', '')}
                  </>
                )}
                {showShift && (
                  <>
                    {opButton('SHL', '')}
                    {opButton('SHR', '')}
                  </>
                )}
                {showNeg && <div className="col-span-2 grid px-12">{opButton('NEG', '')}</div>}
              </div>
            </div>
            <div className="flex gap-4 pt-6" data-guide="befehle">
              <div className="flex flex-col gap-2">
                {opButton('LDA', 'op-transfer')}
                {opButton('STA', 'op-transfer')}
              </div>
              <div className="flex flex-col gap-2">
                {opButton('ADD', 'op-arith')}
                {opButton('SUB', 'op-arith')}
                {opButton('MUL', 'op-arith')}
                {opButton('DIV', 'op-arith')}
              </div>
              {showLogic && (
                <div className="flex flex-col gap-2">
                  {opButton('AND', 'op-arith')}
                  {opButton('OR', 'op-arith')}
                  {opButton('XOR', 'op-arith')}
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 flex justify-between gap-4">
            {opButton('INM', 'op-io')}
            {opButton('OUTM', 'op-io')}
          </div>
        </section>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(320px,1fr)_minmax(280px,1fr)_minmax(320px,1fr)]">
          <div className="flex min-h-0 flex-col gap-3">
            <GroupBox title="Eingabe" guide="eingabe" className={enteringData ? 'selecting' : ''}>
              <div className="flex flex-col gap-2">
                <InputBits value={m.input} onToggle={(bit) => dispatch({ type: 'toggleBit', bit })} />
                <button type="button" className="btn self-end" disabled={!enteringData} onClick={() => dispatch({ type: 'commit' })}>
                  übernehmen
                </button>
              </div>
            </GroupBox>
            <GroupBox title="Protokoll" guide="protokoll" className="flex min-h-56 flex-1 flex-col">
              <pre className="sunken min-h-32 flex-1 overflow-auto p-1 font-mono text-xs" aria-label="Protokoll" ref={(el) => {
                el?.scrollTo(0, el.scrollHeight)
              }}>
                {m.protocol.join('\n')}
              </pre>
              <div className="mt-2 flex flex-wrap items-center gap-1">
                <button type="button" className="btn px-2!" aria-pressed={m.recording} disabled={m.recording} onClick={() => dispatch({ type: 'record', on: true })}>
                  Protokoll starten
                </button>
                <button type="button" className="btn px-2!" aria-pressed={!m.recording} disabled={!m.recording} onClick={() => dispatch({ type: 'record', on: false })}>
                  Protokoll beenden
                </button>
                <label className="flex items-center gap-1 px-1">
                  <input type="checkbox" checked={m.withComment} onChange={(e) => dispatch({ type: 'comment', on: e.target.checked })} />
                  mit Kommentar
                </label>
                <span className="flex-1" />
                <button type="button" className="btn px-2!" disabled={m.protocol.length === 0} onClick={saveProtocol} title="Protokoll als Textdatei speichern">
                  speichern
                </button>
                <button type="button" className="btn px-2!" disabled={m.protocol.length === 0} onClick={() => dispatch({ type: 'clearProtocol' })}>
                  löschen
                </button>
              </div>
            </GroupBox>
          </div>
          <GroupBox title={selectingCell ? 'Speicher – Zelle anklicken' : 'Speicher'} guide="speicher" className={`flex min-h-0 flex-col ${selectingCell ? 'selecting' : ''}`}>
            <div className="h-[50vh] min-h-64 lg:h-auto lg:min-h-0 lg:flex-1">
              <MemoryList memory={m.mem} selectable={selectingCell} last={m.last} onSelect={(addr) => dispatch({ type: 'cell', addr })} />
            </div>
          </GroupBox>
          <div>
            <GroupBox title="Ausgabe" guide="ausgabe">
              <OutputLeds value={m.output} />
            </GroupBox>
          </div>
        </div>
      </main>

      <footer className="menubar flex min-h-9 items-center gap-2 border-t border-line px-3 py-1" role="status">
        <span className={`flex-1 ${m.statusIsError ? 'font-bold text-err' : ''}`}>{m.status}</span>
        {pending && (
          <button type="button" className="btn py-0.5!" onClick={() => dispatch({ type: 'cancel' })}>
            Abbrechen (Esc)
          </button>
        )}
      </footer>

      {guideIndex !== null && <GuideOverlay index={guideIndex} onIndex={gotoGuideStep} onClose={closeGuide} />}
      {m.alert && (
        <Dialog title="CPU-Direkt" onClose={() => dispatch({ type: 'dismissAlert' })}>
          <Lines text={m.alert} />
          <button type="button" className="btn self-center px-8!" onClick={() => dispatch({ type: 'dismissAlert' })} autoFocus>
            OK
          </button>
        </Dialog>
      )}
      {doc && (
        <Dialog title={doc.title} onClose={() => setDoc(null)} wide>
          <iframe
            title={doc.title}
            src={doc.src}
            className="sunken doc-frame min-h-0 w-full flex-1 bg-white"
            onLoad={(e) => e.currentTarget.contentWindow?.addEventListener('keydown', (ev) => ev.key === 'Escape' && setDoc(null))}
          />
        </Dialog>
      )}
      {about && (
        <Dialog title="about" onClose={() => setAbout(false)}>
          <p className="mb-2 font-bold">CPU-Direkt – Web-Version</p>
          <p className="mb-2">Nachbau des Unterrichtsprogramms CPU-Direkt (J. Schmidt) als Webapp: ein Mikroprozessor mit Akkumulator und 256 Speicherzellen à 16 Bit, direkt per Mausklick gesteuert.</p>
          <p className="mb-2">
            Projekt und Fehlermeldungen:{' '}
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="text-info underline">
              {REPO_URL.replace('https://', '')}
            </a>
          </p>
          <button type="button" className="btn self-center px-8!" onClick={() => setAbout(false)} autoFocus>
            OK
          </button>
        </Dialog>
      )}
    </div>
  )
}

function Lines({ text }: { text: string }): ReactNode {
  return (
    <div className="mb-4">
      {text.split('\n').map((line, i) => (
        <p key={i} className="min-h-4">
          {line}
        </p>
      ))}
    </div>
  )
}
